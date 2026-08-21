use std::{env, fmt::Write as _};

use anyhow::{Result, bail};
use axum::http::{HeaderMap, StatusCode};
use sha2::{Digest, Sha256};
use sqlx::PgPool;

use crate::{
    app_state::AppState,
    db,
    error::HttpError,
    modules::{audit, auth::model::AdminIdentity},
    security::generate_session_token,
};

use super::{
    dto::{CreateActivationGrantInput, IssuedActivationGrant},
    gateway::PaymentGateway,
};

/// Header carrying a controlled-mode authorization secret. Deliberately separate from the
/// customer and admin session headers: signing in must never grant payment activation.
pub const ACTIVATION_HEADER: &str = "x-payment-activation";

/// One message for every gate rejection, so a caller cannot tell an unknown secret from an
/// expired or already-spent one, nor `controlled` mode from `disabled`.
pub(crate) const GATE_REJECTION_MESSAGE: &str =
    "Online payment is not available right now. Please contact Ekoway Hardware.";

const AUDIT_ENTITY: &str = "payment_activation_grant";
const AUDIT_ACTOR: &str = "payment-activation";
const DEFAULT_GRANT_MINUTES: i32 = 15;
const MAX_GRANT_MINUTES: i32 = 60;
const MAX_LABEL_LENGTH: usize = 120;

/// How the deployment answers a new payment initiation. Resolved once at startup and carried in
/// [`AppState`], so the mode a request is judged by cannot be influenced by that request.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PaymentActivationMode {
    /// Reject every new payment initiation.
    Disabled,
    /// Reject ordinary customers; admit a single valid short-lived UAT authorization.
    Controlled,
    /// Normal secure checkout for everyone.
    Public,
}

impl PaymentActivationMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Disabled => "disabled",
            Self::Controlled => "controlled",
            Self::Public => "public",
        }
    }

    /// Strict: only the three exact spellings are accepted. Anything else — including the
    /// plausible-looking `enabled`, `live`, `on` or `true` — is a configuration error rather than
    /// a value that gets rounded to the nearest mode.
    pub fn parse(value: &str) -> Result<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "disabled" => Ok(Self::Disabled),
            "controlled" => Ok(Self::Controlled),
            "public" => Ok(Self::Public),
            _ => bail!("PAYMENT_ACTIVATION_MODE must be `disabled`, `controlled` or `public`."),
        }
    }

    /// Fails closed twice over: an unset or blank setting resolves to `disabled`, and a set but
    /// unrecognised setting is an error the caller must surface — never `public`.
    pub fn resolve(value: Option<&str>) -> Result<Self> {
        match value.map(str::trim) {
            None | Some("") => Ok(Self::Disabled),
            Some(value) => Self::parse(value),
        }
    }

    /// Read at startup so an invalid value stops the process instead of surfacing as a runtime
    /// rejection nobody notices.
    pub fn from_environment() -> Result<Self> {
        Self::resolve(env::var("PAYMENT_ACTIVATION_MODE").ok().as_deref())
    }
}

/// Proof that the activation gate admitted this request. The fields are private and
/// [`authorize_checkout`] is the only constructor, so no code path can reach order creation, the
/// payment ledger, the stock hold or the gateway without having passed the gate first.
#[derive(Debug)]
pub struct PaymentInitiationApproval {
    mode: PaymentActivationMode,
    grant_id: Option<i64>,
}

impl PaymentInitiationApproval {
    pub fn mode(&self) -> PaymentActivationMode {
        self.mode
    }

    pub fn grant_id(&self) -> Option<i64> {
        self.grant_id
    }
}

/// The single entry point to a new gateway payment. The ordering is the security property:
///
/// 1. a closed gate is refused before any configuration or database work;
/// 2. the provider is resolved next — it is a pure configuration read, so failing closed here
///    cannot spend a single-use authorization on a checkout that could never have started;
/// 3. only then is the authorization atomically consumed, still ahead of every commerce mutation.
pub async fn authorize_checkout(
    state: &AppState,
    headers: &HeaderMap,
    configured_gateway: Result<Option<Box<dyn PaymentGateway>>>,
) -> Result<(Box<dyn PaymentGateway>, PaymentInitiationApproval), HttpError> {
    let mode = state.payment_activation_mode;
    if mode == PaymentActivationMode::Disabled {
        return Err(reject("payment activation mode is disabled"));
    }

    let gateway = match configured_gateway {
        Ok(Some(gateway)) => gateway,
        Ok(None) => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "Online payment is not configured yet. Please contact Ekoway Hardware.".to_string(),
            ));
        }
        Err(config_error) => {
            tracing::error!(%config_error, "payment gateway configuration is invalid");
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "Online payment is temporarily unavailable. Please contact Ekoway Hardware."
                    .to_string(),
            ));
        }
    };

    let approval = match mode {
        // A stale authorization is neither honoured nor spent here: public checkout is already
        // the normal secure path, and consuming the secret would let anyone burn a live grant.
        PaymentActivationMode::Public => PaymentInitiationApproval {
            mode,
            grant_id: None,
        },
        PaymentActivationMode::Controlled => {
            let Some(secret) = presented_secret(headers) else {
                return Err(reject(
                    "controlled mode requires an activation authorization",
                ));
            };
            match db::consume_payment_activation_grant(&state.pool, &digest(&secret)).await {
                Ok(Some(grant_id)) => {
                    audit::service::record_event(
                        &state.pool,
                        AUDIT_ACTOR,
                        "consume",
                        AUDIT_ENTITY,
                        &grant_id.to_string(),
                        "controlled payment initiation authorized",
                    )
                    .await;
                    PaymentInitiationApproval {
                        mode,
                        grant_id: Some(grant_id),
                    }
                }
                Ok(None) => {
                    return Err(reject(
                        "activation authorization is unknown, expired or already used",
                    ));
                }
                Err(error) => {
                    tracing::error!(%error, "activation authorization lookup failed");
                    return Err(reject("activation authorization could not be verified"));
                }
            }
        }
        // Already refused above. Repeated rather than made `unreachable!` so that reordering this
        // function can only ever close the gate, never open it.
        PaymentActivationMode::Disabled => {
            return Err(reject("payment activation mode is disabled"));
        }
    };

    Ok((gateway, approval))
}

/// Links a spent authorization to the order it produced. Recorded after the checkout succeeds so
/// the audit trail answers "which order did this UAT grant create?" without a second lookup.
pub async fn record_authorized_checkout(
    pool: &PgPool,
    approval: &PaymentInitiationApproval,
    order_id: i32,
) {
    let Some(grant_id) = approval.grant_id else {
        return;
    };

    audit::service::record_event(
        pool,
        AUDIT_ACTOR,
        "checkout",
        AUDIT_ENTITY,
        &grant_id.to_string(),
        &format!("order #{order_id}"),
    )
    .await;
}

/// Mints a controlled-mode authorization. The raw secret is returned to the caller exactly once;
/// only its digest reaches the database, and neither the secret nor its digest is logged.
pub async fn issue_grant(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreateActivationGrantInput,
) -> Result<IssuedActivationGrant> {
    let minutes = input.expires_in_minutes.unwrap_or(DEFAULT_GRANT_MINUTES);
    if !(1..=MAX_GRANT_MINUTES).contains(&minutes) {
        bail!("Activation authorization must expire within 1 to {MAX_GRANT_MINUTES} minutes.");
    }

    let label = input.label.as_deref().unwrap_or_default().trim();
    if label.chars().count() > MAX_LABEL_LENGTH {
        bail!("Activation authorization label is too long.");
    }

    let secret = generate_session_token();
    let record = db::create_payment_activation_grant(
        pool,
        &db::NewPaymentActivationGrant {
            token_sha256: &digest(&secret),
            label,
            issued_by: &identity.username,
            expires_in_minutes: minutes,
        },
    )
    .await?;

    audit::service::record_event(
        pool,
        &identity.username,
        "issue",
        AUDIT_ENTITY,
        &record.id.to_string(),
        &format!("expires {} for {minutes} minutes", record.expires_at),
    )
    .await;

    Ok(IssuedActivationGrant {
        id: record.id,
        label: label.to_string(),
        expires_at: record.expires_at,
        authorization: secret,
    })
}

fn presented_secret(headers: &HeaderMap) -> Option<String> {
    headers
        .get(ACTIVATION_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

/// Logs why the gate closed — never what was presented — and returns the uniform client message.
fn reject(reason: &'static str) -> HttpError {
    tracing::warn!(reason, "payment initiation rejected by the activation gate");
    (
        StatusCode::SERVICE_UNAVAILABLE,
        GATE_REJECTION_MESSAGE.to_string(),
    )
}

fn digest(secret: &str) -> String {
    let bytes = Sha256::digest(secret.as_bytes());
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(output, "{byte:02x}");
    }
    output
}

#[cfg(test)]
mod tests {
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };

    use http_body_util::BodyExt;
    use serde_json::json;
    use tower::ServiceExt;

    use crate::{
        models::{CreateOrderInput, CreateOrderItemInput, Order},
        modules::payments::{gateway::GatewayFuture, service},
    };

    use super::*;

    /// Stands in for a configured hosted-checkout provider so the gate can be exercised without
    /// a network call, and counts initiations so a rejected attempt can be proven inert.
    struct StubGateway {
        starts: Arc<AtomicUsize>,
    }

    impl PaymentGateway for StubGateway {
        fn provider(&self) -> &'static str {
            "stub"
        }

        fn start_checkout<'a>(
            &'a self,
            _pool: &'a PgPool,
            order: Order,
        ) -> GatewayFuture<'a, super::super::gateway::PaymentCheckout> {
            let starts = self.starts.clone();
            Box::pin(async move {
                starts.fetch_add(1, Ordering::SeqCst);
                Ok(super::super::gateway::PaymentCheckout {
                    order,
                    payment_url: "https://stub.invalid/checkout".to_string(),
                    provider: "stub".to_string(),
                })
            })
        }
    }

    fn counting_gateway(starts: &Arc<AtomicUsize>) -> Result<Option<Box<dyn PaymentGateway>>> {
        Ok(Some(Box::new(StubGateway {
            starts: starts.clone(),
        })))
    }

    fn configured() -> Result<Option<Box<dyn PaymentGateway>>> {
        counting_gateway(&Arc::new(AtomicUsize::new(0)))
    }

    fn unconfigured() -> Result<Option<Box<dyn PaymentGateway>>> {
        Ok(None)
    }

    fn invalid_configuration() -> Result<Option<Box<dyn PaymentGateway>>> {
        bail!("The billplz adapter is not enabled.")
    }

    fn state(pool: &PgPool, mode: PaymentActivationMode) -> AppState {
        AppState::with_payment_activation_mode(pool.clone(), mode)
    }

    fn presenting(secret: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(ACTIVATION_HEADER, secret.parse().expect("header value"));
        headers
    }

    fn super_admin() -> AdminIdentity {
        AdminIdentity {
            user_id: 1,
            username: "uat-operator".to_string(),
            display_name: "UAT Operator".to_string(),
            role_id: 1,
            role_name: "Super Admin".to_string(),
            is_super_admin: true,
        }
    }

    async fn issue(pool: &PgPool, minutes: i32) -> String {
        issue_grant(
            pool,
            &super_admin(),
            &CreateActivationGrantInput {
                label: Some("production UAT".to_string()),
                expires_in_minutes: Some(minutes),
            },
        )
        .await
        .expect("grant should be issued")
        .authorization
    }

    async fn is_consumed(pool: &PgPool, secret: &str) -> bool {
        sqlx::query_scalar::<_, bool>(
            "SELECT consumed_at IS NOT NULL FROM payment_activation_grants WHERE token_sha256 = $1",
        )
        .bind(digest(secret))
        .fetch_one(pool)
        .await
        .expect("grant should exist")
    }

    async fn expire(pool: &PgPool, secret: &str) {
        sqlx::query(
            "UPDATE payment_activation_grants SET expires_at = now() - interval '1 minute' WHERE token_sha256 = $1",
        )
        .bind(digest(secret))
        .execute(pool)
        .await
        .expect("grant should expire");
    }

    async fn admin_json(
        app: axum::Router,
        path: &str,
        token: Option<&str>,
        body: &serde_json::Value,
    ) -> serde_json::Value {
        let mut builder = axum::http::Request::builder()
            .method("POST")
            .uri(path)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            // The login route extracts `ConnectInfo` for client-IP throttling; oneshot
            // requests must supply the extension the real server injects.
            .extension(axum::extract::ConnectInfo(std::net::SocketAddr::from((
                [127, 0, 0, 1],
                41_042,
            ))));
        if let Some(token) = token {
            builder = builder.header(axum::http::header::AUTHORIZATION, format!("Bearer {token}"));
        }

        let response = app
            .oneshot(
                builder
                    .body(axum::body::Body::from(body.to_string()))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert!(
            response.status().is_success(),
            "{path} should succeed, got {}",
            response.status()
        );
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        serde_json::from_slice(&bytes).expect("json body")
    }

    async fn seed_order_input(pool: &PgPool) -> (CreateOrderInput, i32) {
        let product_id =
            sqlx::query_scalar::<_, i32>("SELECT id FROM products ORDER BY id LIMIT 1")
                .fetch_one(pool)
                .await
                .expect("seed product");
        sqlx::query("UPDATE products SET price_cents = 1000, stock_quantity = 5 WHERE id = $1")
            .bind(product_id)
            .execute(pool)
            .await
            .expect("set stock");

        (
            CreateOrderInput {
                customer_name: "UAT Buyer".to_string(),
                customer_email: "uat@example.com".to_string(),
                customer_phone: Some("0123456789".to_string()),
                fulfillment_method: Some("pickup".to_string()),
                items: vec![CreateOrderItemInput {
                    product_id,
                    quantity: 1,
                }],
                promotion_id: None,
                voucher_code: None,
                shipping_address: None,
                shipping_service_code: None,
            },
            product_id,
        )
    }

    #[sqlx::test]
    async fn disabled_mode_rejects_every_initiation_even_with_a_provider_and_a_valid_grant(
        pool: PgPool,
    ) {
        let secret = issue(&pool, 15).await;
        let state = state(&pool, PaymentActivationMode::Disabled);
        let starts = Arc::new(AtomicUsize::new(0));

        assert!(
            authorize_checkout(&state, &HeaderMap::new(), counting_gateway(&starts))
                .await
                .is_err(),
            "disabled mode must reject an unauthorized attempt"
        );
        assert!(
            authorize_checkout(&state, &presenting(&secret), counting_gateway(&starts))
                .await
                .is_err(),
            "disabled mode must reject even a valid authorization"
        );
        assert_eq!(starts.load(Ordering::SeqCst), 0);
        assert!(
            !is_consumed(&pool, &secret).await,
            "a disabled-mode attempt must not spend the authorization"
        );
    }

    #[sqlx::test]
    async fn controlled_mode_rejects_missing_unknown_blank_expired_and_spent_authorizations(
        pool: PgPool,
    ) {
        let state = state(&pool, PaymentActivationMode::Controlled);
        let starts = Arc::new(AtomicUsize::new(0));

        assert!(
            authorize_checkout(&state, &HeaderMap::new(), counting_gateway(&starts))
                .await
                .is_err(),
            "an ordinary customer presents no authorization"
        );
        assert!(
            authorize_checkout(
                &state,
                &presenting("bf4c1a0d9e2f38a7bc5d6e1f0a2b3c4d"),
                counting_gateway(&starts)
            )
            .await
            .is_err(),
            "an invented authorization must be rejected"
        );
        assert!(
            authorize_checkout(&state, &presenting("   "), counting_gateway(&starts))
                .await
                .is_err(),
            "a blank authorization must be rejected"
        );

        let expired = issue(&pool, 15).await;
        expire(&pool, &expired).await;
        assert!(
            authorize_checkout(&state, &presenting(&expired), counting_gateway(&starts))
                .await
                .is_err(),
            "an expired authorization must be rejected"
        );

        let spent = issue(&pool, 15).await;
        assert!(
            authorize_checkout(&state, &presenting(&spent), counting_gateway(&starts))
                .await
                .is_ok()
        );
        assert!(
            authorize_checkout(&state, &presenting(&spent), counting_gateway(&starts))
                .await
                .is_err(),
            "a spent authorization must be rejected"
        );

        assert_eq!(
            starts.load(Ordering::SeqCst),
            0,
            "the gate must never hand a rejected attempt to the provider"
        );
    }

    #[sqlx::test]
    async fn controlled_mode_admits_a_valid_authorization_exactly_once(pool: PgPool) {
        let secret = issue(&pool, 15).await;
        let state = state(&pool, PaymentActivationMode::Controlled);

        let (_, approval) = authorize_checkout(&state, &presenting(&secret), configured())
            .await
            .expect("a valid unused authorization is admitted");
        assert_eq!(approval.mode(), PaymentActivationMode::Controlled);
        let grant_id = approval.grant_id().expect("an approval records its grant");
        assert!(is_consumed(&pool, &secret).await);

        assert!(
            authorize_checkout(&state, &presenting(&secret), configured())
                .await
                .is_err(),
            "replaying the same authorization must fail"
        );

        let consumptions = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM audit_events WHERE entity_type = 'payment_activation_grant' AND action = 'consume' AND entity_id = $1",
        )
        .bind(grant_id.to_string())
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(consumptions, 1, "exactly one consumption is auditable");
    }

    #[sqlx::test]
    async fn concurrent_replay_of_one_authorization_admits_exactly_one_request(pool: PgPool) {
        let secret = issue(&pool, 15).await;
        let state = state(&pool, PaymentActivationMode::Controlled);

        let headers = presenting(&secret);
        let (left, right) = tokio::join!(
            authorize_checkout(&state, &headers, configured()),
            authorize_checkout(&state, &headers, configured()),
        );

        assert_eq!(
            usize::from(left.is_ok()) + usize::from(right.is_ok()),
            1,
            "exactly one concurrent claim may pass"
        );
        assert!(is_consumed(&pool, &secret).await);
    }

    #[sqlx::test]
    async fn public_mode_checks_out_normally_and_leaves_a_stale_authorization_inert(pool: PgPool) {
        let state = state(&pool, PaymentActivationMode::Public);

        let (_, approval) = authorize_checkout(&state, &HeaderMap::new(), configured())
            .await
            .expect("public checkout needs no authorization");
        assert_eq!(approval.mode(), PaymentActivationMode::Public);
        assert!(approval.grant_id().is_none());

        let stale = issue(&pool, 15).await;
        let (_, approval) = authorize_checkout(&state, &presenting(&stale), configured())
            .await
            .expect("a stale authorization neither helps nor blocks public checkout");
        assert!(
            approval.grant_id().is_none(),
            "public mode must not derive authority from a presented secret"
        );
        assert!(
            !is_consumed(&pool, &stale).await,
            "public mode must not let an anonymous caller burn a live authorization"
        );
    }

    #[sqlx::test]
    async fn a_missing_or_invalid_provider_fails_closed_without_spending_the_authorization(
        pool: PgPool,
    ) {
        let public = state(&pool, PaymentActivationMode::Public);
        assert!(
            authorize_checkout(&public, &HeaderMap::new(), unconfigured())
                .await
                .is_err(),
            "public mode with no provider must fail closed"
        );
        assert!(
            authorize_checkout(&public, &HeaderMap::new(), invalid_configuration())
                .await
                .is_err(),
            "public mode with an invalid provider must fail closed"
        );

        let secret = issue(&pool, 15).await;
        let controlled = state(&pool, PaymentActivationMode::Controlled);
        assert!(
            authorize_checkout(&controlled, &presenting(&secret), unconfigured())
                .await
                .is_err()
        );
        assert!(
            authorize_checkout(&controlled, &presenting(&secret), invalid_configuration())
                .await
                .is_err()
        );
        assert!(
            !is_consumed(&pool, &secret).await,
            "a provider failure must not spend a single-use authorization"
        );

        assert!(
            authorize_checkout(&controlled, &presenting(&secret), configured())
                .await
                .is_ok(),
            "the authorization is still usable once the provider is configured"
        );
    }

    #[sqlx::test]
    async fn an_admitted_controlled_checkout_reaches_commerce_and_links_the_grant(pool: PgPool) {
        let (input, product_id) = seed_order_input(&pool).await;
        let secret = issue(&pool, 15).await;
        let state = state(&pool, PaymentActivationMode::Controlled);
        let starts = Arc::new(AtomicUsize::new(0));

        let (gateway, approval) =
            authorize_checkout(&state, &presenting(&secret), counting_gateway(&starts))
                .await
                .expect("valid authorization");
        let grant_id = approval.grant_id().expect("grant id");
        let checkout =
            service::start_gateway_checkout(&pool, gateway.as_ref(), &input, None, &approval)
                .await
                .expect("checkout proceeds once admitted");
        record_authorized_checkout(&pool, &approval, checkout.order.id).await;

        assert_eq!(starts.load(Ordering::SeqCst), 1);
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4, "an admitted checkout holds stock as usual");

        let linked = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM audit_events WHERE entity_type = 'payment_activation_grant' AND action = 'checkout' AND entity_id = $1 AND detail = $2",
        )
        .bind(grant_id.to_string())
        .bind(format!("order #{}", checkout.order.id))
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            linked, 1,
            "the spent grant is linked to the order it created"
        );
    }

    #[sqlx::test]
    async fn an_authorization_issued_over_the_admin_route_is_the_one_the_gate_accepts(
        pool: PgPool,
    ) {
        let role_id = sqlx::query_scalar::<_, i32>("SELECT id FROM roles WHERE is_super_admin")
            .fetch_one(&pool)
            .await
            .expect("super admin role");
        crate::db::create_admin_user(
            &pool,
            "uat-super",
            "UAT Super",
            &crate::security::hash_password("secret123").expect("hash"),
            role_id,
        )
        .await
        .expect("admin user");

        let app = crate::routes::build_router(
            AppState::with_payment_activation_mode(pool.clone(), PaymentActivationMode::Controlled),
            "http://localhost:5173".parse().unwrap(),
        );
        let session = admin_json(
            app.clone(),
            "/api/admin/login",
            None,
            &json!({ "username": "uat-super", "password": "secret123" }),
        )
        .await;
        let admin_token = session["token"].as_str().expect("admin token").to_string();
        let issued = admin_json(
            app,
            "/api/admin/payments/activation-grants",
            Some(&admin_token),
            &json!({ "label": "end-to-end" }),
        )
        .await;
        let secret = issued["authorization"].as_str().expect("authorization");

        let state = state(&pool, PaymentActivationMode::Controlled);
        assert!(
            authorize_checkout(&state, &presenting(secret), configured())
                .await
                .is_ok(),
            "the secret handed to the operator is the one the gate accepts"
        );
        assert!(
            authorize_checkout(&state, &presenting(secret), configured())
                .await
                .is_err(),
            "and it is spent by that single use"
        );
    }

    #[sqlx::test]
    async fn an_issued_authorization_is_stored_only_as_a_digest_and_never_audited_in_plaintext(
        pool: PgPool,
    ) {
        let secret = issue(&pool, 15).await;

        let stored = sqlx::query_scalar::<_, String>(
            "SELECT token_sha256 FROM payment_activation_grants WHERE token_sha256 = $1",
        )
        .bind(digest(&secret))
        .fetch_one(&pool)
        .await
        .expect("grant is stored by digest");
        assert_eq!(stored, digest(&secret));
        assert_ne!(stored, secret);

        let plaintext_rows = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payment_activation_grants WHERE token_sha256 = $1 OR label = $1 OR issued_by = $1",
        )
        .bind(&secret)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(plaintext_rows, 0, "the raw secret is never persisted");

        let audit_rows = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM audit_events WHERE detail LIKE '%' || $1 || '%' OR entity_id = $1 OR actor = $1",
        )
        .bind(&secret)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            audit_rows, 0,
            "the raw secret never reaches the audit trail"
        );
    }

    #[sqlx::test]
    async fn issued_authorizations_are_short_lived_and_bounded(pool: PgPool) {
        let identity = super_admin();

        for minutes in [0, -1, 61, 1440] {
            assert!(
                issue_grant(
                    &pool,
                    &identity,
                    &CreateActivationGrantInput {
                        label: None,
                        expires_in_minutes: Some(minutes),
                    },
                )
                .await
                .is_err(),
                "{minutes} minutes must be refused"
            );
        }

        assert!(
            issue_grant(
                &pool,
                &identity,
                &CreateActivationGrantInput {
                    label: Some("x".repeat(MAX_LABEL_LENGTH + 1)),
                    expires_in_minutes: None,
                },
            )
            .await
            .is_err(),
            "an oversized label must be refused"
        );

        let default_lifetime =
            issue_grant(&pool, &identity, &CreateActivationGrantInput::default())
                .await
                .expect("default lifetime");
        let within_default = sqlx::query_scalar::<_, bool>(
            "SELECT expires_at <= now() + make_interval(mins => $1) FROM payment_activation_grants WHERE id = $2",
        )
        .bind(DEFAULT_GRANT_MINUTES)
        .bind(default_lifetime.id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(within_default, "the default lifetime is short");
    }

    #[test]
    fn every_supported_mode_parses_exactly() {
        assert_eq!(
            PaymentActivationMode::parse("disabled").unwrap(),
            PaymentActivationMode::Disabled
        );
        assert_eq!(
            PaymentActivationMode::parse("controlled").unwrap(),
            PaymentActivationMode::Controlled
        );
        assert_eq!(
            PaymentActivationMode::parse("public").unwrap(),
            PaymentActivationMode::Public
        );
        assert_eq!(
            PaymentActivationMode::parse("  PUBLIC \n").unwrap(),
            PaymentActivationMode::Public
        );
        for mode in [
            PaymentActivationMode::Disabled,
            PaymentActivationMode::Controlled,
            PaymentActivationMode::Public,
        ] {
            assert_eq!(PaymentActivationMode::parse(mode.as_str()).unwrap(), mode);
        }
    }

    #[test]
    fn missing_or_invalid_configuration_never_resolves_to_public() {
        assert_eq!(
            PaymentActivationMode::resolve(None).unwrap(),
            PaymentActivationMode::Disabled
        );
        assert_eq!(
            PaymentActivationMode::resolve(Some("")).unwrap(),
            PaymentActivationMode::Disabled
        );
        assert_eq!(
            PaymentActivationMode::resolve(Some("   ")).unwrap(),
            PaymentActivationMode::Disabled
        );

        for value in [
            "enabled",
            "live",
            "on",
            "true",
            "1",
            "publi",
            "public;",
            "public,controlled",
            "PUBLIC=1",
            "-",
        ] {
            assert!(
                PaymentActivationMode::resolve(Some(value)).is_err(),
                "`{value}` must not resolve to a mode"
            );
            assert!(PaymentActivationMode::parse(value).is_err());
        }
    }

    #[test]
    fn presented_secret_is_read_from_its_own_header_and_ignores_blanks() {
        let mut headers = HeaderMap::new();
        assert_eq!(presented_secret(&headers), None);

        headers.insert(ACTIVATION_HEADER, "   ".parse().unwrap());
        assert_eq!(presented_secret(&headers), None);

        headers.insert(ACTIVATION_HEADER, "  secret-value  ".parse().unwrap());
        assert_eq!(presented_secret(&headers), Some("secret-value".to_string()));

        let mut bearer_only = HeaderMap::new();
        bearer_only.insert("authorization", "Bearer secret-value".parse().unwrap());
        assert_eq!(presented_secret(&bearer_only), None);
    }

    #[test]
    fn digest_is_sha256_and_never_reversible_to_the_secret() {
        assert_eq!(
            digest("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        let secret = generate_session_token();
        assert_eq!(digest(&secret).len(), 64);
        assert!(!digest(&secret).contains(&secret));
        assert_ne!(digest(&secret), digest(&generate_session_token()));
    }
}
