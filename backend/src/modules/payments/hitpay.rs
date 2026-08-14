use std::{env, fmt::Write, time::Duration};

use anyhow::{Context, Result, anyhow, bail};
use hmac::{Hmac, Mac};
use reqwest::{Client, Url};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::PgPool;

use crate::{db, models::Order};

use super::gateway::{
    GatewayFuture, GatewayReconciliationResult, GatewayRefundInput, GatewayRefundResult,
    PaymentCheckout, PaymentGateway,
};

type HmacSha256 = Hmac<Sha256>;

const PROVIDER: &str = "hitpay";
const SANDBOX_API_BASE: &str = "https://api.sandbox.hit-pay.com";
const PRODUCTION_API_BASE: &str = "https://api.hit-pay.com";
const SANDBOX_CHECKOUT_HOSTS: &[&str] = &[
    "securecheckout.sandbox.hit-pay.com",
    "checkout.sandbox.hit-pay.com",
];
const PROVIDER_ORDER_PREFIX: &str = "EKW-";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum HitPayMode {
    Sandbox,
    Production,
}

impl HitPayMode {
    fn parse(value: &str) -> Result<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "sandbox" => Ok(Self::Sandbox),
            "production" => Ok(Self::Production),
            _ => bail!("HITPAY_MODE must be `sandbox` or `production`."),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Sandbox => "sandbox",
            Self::Production => "production",
        }
    }
}

struct ResolvedHitPayEnvironment {
    mode: HitPayMode,
    api_key: String,
    webhook_salt: String,
    api_base: &'static str,
}

#[derive(Clone)]
pub struct HitPayConfig {
    mode: HitPayMode,
    api_key: String,
    webhook_salt: String,
    redirect_url: String,
    api_base: String,
    client: Client,
}

impl HitPayConfig {
    /// Mode-specific credentials are deliberately separate. Production mode refuses generic or
    /// sandbox credentials, so changing only `HITPAY_MODE` can never activate live payments.
    pub fn from_environment() -> Result<Option<Self>> {
        let Some(resolved) = resolve_environment(env_value)? else {
            return Ok(None);
        };

        let redirect_url = match env_value("HITPAY_REDIRECT_URL") {
            Some(value) => value,
            None => {
                let frontend = env::var("FRONTEND_ORIGIN")
                    .unwrap_or_else(|_| "http://localhost:5173".to_string());
                format!(
                    "{}/shop?payment_return=hitpay",
                    frontend.trim_end_matches('/')
                )
            }
        };
        validate_redirect_url(&redirect_url, resolved.mode)?;

        Ok(Some(Self {
            mode: resolved.mode,
            api_key: resolved.api_key,
            webhook_salt: resolved.webhook_salt,
            redirect_url,
            api_base: resolved.api_base.to_string(),
            client: Client::builder()
                .timeout(Duration::from_secs(20))
                .build()
                .with_context(|| {
                    format!(
                        "failed to build the HitPay {} HTTP client",
                        resolved.mode.label()
                    )
                })?,
        }))
    }

    fn endpoint(&self, path: &str) -> String {
        format!("{}{path}", self.api_base.trim_end_matches('/'))
    }

    fn verify_webhook_signature(&self, raw_body: &[u8], signature: &str) -> Result<()> {
        let received = decode_hex(signature.trim())?;
        let mut mac = HmacSha256::new_from_slice(self.webhook_salt.as_bytes())
            .expect("HMAC accepts keys of every size");
        mac.update(raw_body);
        mac.verify_slice(&received)
            .map_err(|_| anyhow!("Invalid HitPay webhook signature."))
    }

    #[cfg(test)]
    fn test_config(api_base: String) -> Self {
        Self {
            mode: HitPayMode::Sandbox,
            api_key: "test-api-key".to_string(),
            webhook_salt: "test-webhook-salt".to_string(),
            redirect_url: "http://localhost:5173/shop?payment_return=hitpay".to_string(),
            api_base,
            client: Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .expect("test client"),
        }
    }
}

#[derive(Debug, Deserialize)]
struct HitPayPaymentRequest {
    id: String,
    amount: Value,
    currency: String,
    status: String,
    reference_number: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    payments: Vec<HitPayPayment>,
}

#[derive(Debug, Deserialize)]
struct HitPayPayment {
    id: String,
    status: String,
    amount: Value,
    currency: String,
    #[serde(default)]
    status_reason: Option<String>,
    #[serde(default)]
    status_reason_code: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HitPayRefundResponse {
    id: String,
    payment_id: String,
    amount_refunded: Value,
    currency: String,
    status: String,
}

struct NormalizedEvent {
    provider_request_id: String,
    provider_payment_id: String,
    provider_order_id: String,
    amount_cents: i32,
    currency: String,
    status: db::GatewayPaymentStatus,
    message: String,
}

pub async fn start_checkout(
    pool: &PgPool,
    config: &HitPayConfig,
    order: Order,
) -> Result<PaymentCheckout> {
    if order.total_cents <= 0 {
        bail!("The checkout total must be greater than zero.");
    }
    let provider_order_id = provider_order_id(order.id)?;
    db::begin_gateway_payment_with_currency(
        pool,
        PROVIDER,
        order.id,
        &provider_order_id,
        order.total_cents,
        "MYR",
    )
    .await?;

    let amount = format_money(order.total_cents)?;
    let response = config
        .client
        .post(config.endpoint("/v1/payment-requests"))
        .header("X-BUSINESS-API-KEY", &config.api_key)
        .header("X-Requested-With", "XMLHttpRequest")
        .form(&[
            ("amount", amount.as_str()),
            ("currency", "MYR"),
            ("email", order.customer_email.as_str()),
            ("name", order.customer_name.as_str()),
            ("phone", order.customer_phone.as_str()),
            ("purpose", "Ekoway Hardware online order"),
            ("reference_number", provider_order_id.as_str()),
            ("redirect_url", config.redirect_url.as_str()),
            ("allow_repeated_payments", "false"),
            // HitPay's current parser accepts the documented `mins`, `hours` and `days`
            // units. Keep this aligned with the local 60-minute stock reservation.
            ("expires_after", "60 mins"),
        ])
        .send()
        .await
        .with_context(|| {
            format!(
                "HitPay {} payment-request connection failed",
                config.mode.label()
            )
        })?;
    if !response.status().is_success() {
        bail!(
            "HitPay rejected the payment request (HTTP {}).",
            response.status()
        );
    }
    let response: HitPayPaymentRequest = response
        .json()
        .await
        .context("HitPay returned an invalid payment-request response")?;
    validate_created_request(
        &response,
        &provider_order_id,
        order.total_cents,
        config.mode,
    )?;

    db::bind_gateway_payment_request(
        pool,
        PROVIDER,
        &provider_order_id,
        &response.id,
        order.total_cents,
        "MYR",
    )
    .await?;

    Ok(PaymentCheckout {
        order,
        payment_url: response.url,
        provider: PROVIDER.to_string(),
    })
}

pub async fn process_webhook(
    pool: &PgPool,
    config: &HitPayConfig,
    signature: &str,
    event_type: &str,
    event_object: &str,
    raw_body: &[u8],
) -> Result<db::GatewayEventOutcome> {
    config.verify_webhook_signature(raw_body, signature)?;
    if event_object.trim() != "payment_request" {
        bail!("Unsupported HitPay webhook object.");
    }
    let request: HitPayPaymentRequest =
        serde_json::from_slice(raw_body).context("HitPay webhook body is not valid JSON")?;
    let normalized = normalize_payment_request(&request, Some(event_type))?;
    let payload_sha256 = sha256_hex(raw_body);
    let event_key = format!(
        "{}:{}:{}:{}",
        normalized.provider_request_id,
        event_type.trim().to_ascii_lowercase(),
        normalized.provider_payment_id,
        payload_sha256
    );
    db::apply_verified_gateway_payment_event(
        pool,
        &db::VerifiedGatewayPaymentEvent {
            provider: PROVIDER,
            event_key: &event_key,
            provider_order_id: &normalized.provider_order_id,
            provider_request_id: &normalized.provider_request_id,
            provider_payment_id: &normalized.provider_payment_id,
            amount_cents: normalized.amount_cents,
            currency: &normalized.currency,
            status: normalized.status,
            message: &normalized.message,
            payload_sha256: &payload_sha256,
        },
    )
    .await
}

async fn reconcile_payment(
    pool: &PgPool,
    config: &HitPayConfig,
    payment_id: i32,
) -> Result<GatewayReconciliationResult> {
    let before = db::fetch_gateway_payment(pool, payment_id).await?;
    if before.provider != PROVIDER || before.provider_request_id.is_empty() {
        bail!("Payment is not a bound HitPay payment.");
    }
    let response = config
        .client
        .get(config.endpoint(&format!(
            "/v1/payment-requests/{}",
            before.provider_request_id
        )))
        .header("X-BUSINESS-API-KEY", &config.api_key)
        .send()
        .await
        .with_context(|| {
            format!(
                "HitPay {} reconciliation connection failed",
                config.mode.label()
            )
        })?;
    if !response.status().is_success() {
        bail!("HitPay reconciliation failed (HTTP {}).", response.status());
    }
    let raw = response
        .bytes()
        .await
        .context("HitPay reconciliation response could not be read")?;
    let request: HitPayPaymentRequest =
        serde_json::from_slice(&raw).context("HitPay reconciliation returned invalid JSON")?;
    let normalized = normalize_payment_request(&request, None)?;
    let payload_sha256 = sha256_hex(&raw);
    let event_key = format!(
        "reconcile:{}:{}:{}:{}",
        normalized.provider_request_id,
        request.status.trim().to_ascii_lowercase(),
        normalized.provider_payment_id,
        payload_sha256
    );
    db::apply_verified_gateway_payment_event(
        pool,
        &db::VerifiedGatewayPaymentEvent {
            provider: PROVIDER,
            event_key: &event_key,
            provider_order_id: &normalized.provider_order_id,
            provider_request_id: &normalized.provider_request_id,
            provider_payment_id: &normalized.provider_payment_id,
            amount_cents: normalized.amount_cents,
            currency: &normalized.currency,
            status: normalized.status,
            message: &normalized.message,
            payload_sha256: &payload_sha256,
        },
    )
    .await?;
    let after = db::fetch_gateway_payment(pool, payment_id).await?;
    Ok(GatewayReconciliationResult {
        payment_id,
        provider: PROVIDER.to_string(),
        changed: before.status != after.status,
        status: after.status,
    })
}

async fn refund_payment(
    pool: &PgPool,
    config: &HitPayConfig,
    input: GatewayRefundInput,
) -> Result<GatewayRefundResult> {
    let prepared = db::prepare_gateway_refund(
        pool,
        input.payment_id,
        PROVIDER,
        input.amount_cents,
        &input.idempotency_key,
        &input.requested_by,
    )
    .await?;

    if let Some(existing_status) = prepared.existing_status.as_deref() {
        return match existing_status {
            "Succeeded" => Ok(GatewayRefundResult {
                payment_id: input.payment_id,
                provider: PROVIDER.to_string(),
                provider_refund_id: prepared.existing_provider_refund_id,
                amount_cents: prepared.amount_cents,
                currency: prepared.currency,
                status: "Succeeded".to_string(),
                duplicate: true,
            }),
            "Pending" | "Unknown" => bail!(
                "This refund has an unresolved provider result and must be reconciled before retrying."
            ),
            "Failed" => {
                bail!("This refund attempt already failed; use a new idempotency key after review.")
            }
            _ => bail!("Refund ledger contains an unsupported status."),
        };
    }

    let amount = format_money(prepared.amount_cents)?;
    let response = match config
        .client
        .post(config.endpoint("/v1/refund"))
        .header("X-BUSINESS-API-KEY", &config.api_key)
        .header("X-Requested-With", "XMLHttpRequest")
        .form(&[
            ("amount", amount.as_str()),
            ("payment_id", prepared.payment.provider_payment_id.as_str()),
        ])
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => {
            db::fail_gateway_refund(
                pool,
                prepared.refund_id,
                "Provider outcome is unknown after a connection failure.",
                true,
            )
            .await?;
            bail!("HitPay refund outcome is unknown; reconcile it before retrying.");
        }
    };
    if !response.status().is_success() {
        db::fail_gateway_refund(
            pool,
            prepared.refund_id,
            &format!("HitPay rejected the refund (HTTP {}).", response.status()),
            false,
        )
        .await?;
        bail!("HitPay rejected the refund (HTTP {}).", response.status());
    }
    let response: HitPayRefundResponse = response
        .json()
        .await
        .context("HitPay returned an invalid refund response")?;
    let response_amount = money_to_cents(&response.amount_refunded)?;
    if !response.status.trim().eq_ignore_ascii_case("succeeded") {
        db::fail_gateway_refund(
            pool,
            prepared.refund_id,
            "HitPay returned a non-success refund status.",
            false,
        )
        .await?;
        bail!("HitPay did not complete the refund.");
    }
    db::complete_gateway_refund(
        pool,
        prepared.refund_id,
        &response.id,
        &response.payment_id,
        response_amount,
        &response.currency,
    )
    .await?;
    Ok(GatewayRefundResult {
        payment_id: input.payment_id,
        provider: PROVIDER.to_string(),
        provider_refund_id: response.id,
        amount_cents: response_amount,
        currency: response.currency.to_ascii_uppercase(),
        status: "Succeeded".to_string(),
        duplicate: false,
    })
}

impl PaymentGateway for HitPayConfig {
    fn provider(&self) -> &'static str {
        PROVIDER
    }

    fn start_checkout<'a>(
        &'a self,
        pool: &'a PgPool,
        order: Order,
    ) -> GatewayFuture<'a, PaymentCheckout> {
        Box::pin(async move { start_checkout(pool, self, order).await })
    }

    fn reconcile<'a>(
        &'a self,
        pool: &'a PgPool,
        payment_id: i32,
    ) -> GatewayFuture<'a, GatewayReconciliationResult> {
        Box::pin(async move { reconcile_payment(pool, self, payment_id).await })
    }

    fn refund<'a>(
        &'a self,
        pool: &'a PgPool,
        input: GatewayRefundInput,
    ) -> GatewayFuture<'a, GatewayRefundResult> {
        Box::pin(async move { refund_payment(pool, self, input).await })
    }
}

fn validate_created_request(
    response: &HitPayPaymentRequest,
    provider_order_id: &str,
    amount_cents: i32,
    mode: HitPayMode,
) -> Result<()> {
    if response.id.trim().is_empty()
        || response.reference_number.trim() != provider_order_id
        || money_to_cents(&response.amount)? != amount_cents
        || !response.currency.trim().eq_ignore_ascii_case("MYR")
        || !response.status.trim().eq_ignore_ascii_case("pending")
    {
        bail!("HitPay payment-request response does not match the order.");
    }
    let url = Url::parse(response.url.trim()).context("HitPay returned an invalid checkout URL")?;
    let valid_host = url
        .host_str()
        .is_some_and(|host| checkout_host_is_allowed(mode, host));
    if url.scheme() != "https" || !valid_host {
        bail!("HitPay returned a checkout URL outside the selected environment.");
    }
    Ok(())
}

fn checkout_host_is_allowed(mode: HitPayMode, host: &str) -> bool {
    let host = host.trim().to_ascii_lowercase();
    match mode {
        HitPayMode::Sandbox => SANDBOX_CHECKOUT_HOSTS.contains(&host.as_str()),
        HitPayMode::Production => {
            (host == "hit-pay.com" || host.ends_with(".hit-pay.com"))
                && host != "sandbox.hit-pay.com"
                && !host.contains(".sandbox.hit-pay.com")
        }
    }
}

fn normalize_payment_request(
    request: &HitPayPaymentRequest,
    webhook_event_type: Option<&str>,
) -> Result<NormalizedEvent> {
    let provider_request_id = request.id.trim();
    let provider_order_id = request.reference_number.trim();
    parse_provider_order_id(provider_order_id)?;
    if provider_request_id.is_empty() {
        bail!("HitPay event is missing its payment request identifier.");
    }
    let amount_cents = money_to_cents(&request.amount)?;
    let currency = request.currency.trim().to_ascii_uppercase();
    let top_status = request.status.trim().to_ascii_lowercase();
    if let Some(event_type) = webhook_event_type
        && event_type.trim().to_ascii_lowercase() != top_status
    {
        bail!("HitPay webhook headers and body status do not match.");
    }

    let (status, payment_id, message) = match top_status.as_str() {
        "completed" => {
            let succeeded: Vec<&HitPayPayment> = request
                .payments
                .iter()
                .filter(|payment| payment.status.trim().eq_ignore_ascii_case("succeeded"))
                .collect();
            if succeeded.len() != 1 {
                bail!("Completed HitPay event does not contain exactly one successful payment.");
            }
            validate_child_payment(succeeded[0], amount_cents, &currency)?;
            (
                db::GatewayPaymentStatus::Captured,
                succeeded[0].id.trim().to_string(),
                "HitPay payment completed.".to_string(),
            )
        }
        "failed" => {
            let failed = request
                .payments
                .iter()
                .find(|payment| payment.status.trim().eq_ignore_ascii_case("failed"));
            if let Some(payment) = failed {
                validate_child_payment(payment, amount_cents, &currency)?;
            }
            let message = failed
                .map(|payment| {
                    payment
                        .status_reason
                        .as_deref()
                        .map(str::trim)
                        .filter(|reason| !reason.is_empty())
                        .or_else(|| {
                            payment
                                .status_reason_code
                                .as_deref()
                                .map(str::trim)
                                .filter(|reason| !reason.is_empty())
                        })
                        .unwrap_or("HitPay payment failed.")
                })
                .unwrap_or("HitPay payment failed.")
                .to_string();
            (
                db::GatewayPaymentStatus::Failed,
                failed
                    .map(|payment| payment.id.trim().to_string())
                    .unwrap_or_default(),
                message,
            )
        }
        "pending" => (
            db::GatewayPaymentStatus::Pending,
            String::new(),
            "HitPay payment remains pending.".to_string(),
        ),
        "expired" | "canceled" | "inactive" => (
            db::GatewayPaymentStatus::Failed,
            String::new(),
            format!("HitPay payment request is {top_status}."),
        ),
        _ => bail!("Unknown HitPay payment request status."),
    };
    Ok(NormalizedEvent {
        provider_request_id: provider_request_id.to_string(),
        provider_payment_id: payment_id,
        provider_order_id: provider_order_id.to_string(),
        amount_cents,
        currency,
        status,
        message,
    })
}

fn validate_child_payment(
    payment: &HitPayPayment,
    expected_amount_cents: i32,
    expected_currency: &str,
) -> Result<()> {
    if payment.id.trim().is_empty()
        || money_to_cents(&payment.amount)? != expected_amount_cents
        || !payment
            .currency
            .trim()
            .eq_ignore_ascii_case(expected_currency)
    {
        bail!("HitPay payment identifier, amount or currency is inconsistent.");
    }
    Ok(())
}

fn money_to_cents(value: &Value) -> Result<i32> {
    let raw = match value {
        Value::String(value) => value.trim().to_string(),
        Value::Number(value) => value.to_string(),
        _ => bail!("Payment amount is invalid."),
    };
    let (whole, fraction) = raw.split_once('.').unwrap_or((&raw, ""));
    if whole.is_empty()
        || !whole.bytes().all(|byte| byte.is_ascii_digit())
        || fraction.len() > 2
        || !fraction.bytes().all(|byte| byte.is_ascii_digit())
    {
        bail!("Payment amount is invalid.");
    }
    let whole = whole
        .parse::<i64>()
        .map_err(|_| anyhow!("Payment amount is invalid."))?;
    let fraction = match fraction.len() {
        0 => 0,
        1 => fraction.parse::<i64>()? * 10,
        2 => fraction.parse::<i64>()?,
        _ => unreachable!(),
    };
    let cents = whole
        .checked_mul(100)
        .and_then(|value| value.checked_add(fraction))
        .ok_or_else(|| anyhow!("Payment amount exceeds the supported maximum."))?;
    i32::try_from(cents).map_err(|_| anyhow!("Payment amount exceeds the supported maximum."))
}

fn format_money(cents: i32) -> Result<String> {
    if cents <= 0 {
        bail!("Payment amount must be greater than zero.");
    }
    Ok(format!("{}.{:02}", cents / 100, cents % 100))
}

fn provider_order_id(order_id: i32) -> Result<String> {
    if order_id <= 0 {
        bail!("A valid order is required for payment.");
    }
    Ok(format!("{PROVIDER_ORDER_PREFIX}{order_id}"))
}

fn parse_provider_order_id(value: &str) -> Result<i32> {
    let Some(order_id) = value.strip_prefix(PROVIDER_ORDER_PREFIX) else {
        bail!("Unknown HitPay order reference.");
    };
    let order_id = order_id
        .parse::<i32>()
        .map_err(|_| anyhow!("Unknown HitPay order reference."))?;
    if order_id <= 0 || provider_order_id(order_id)? != value {
        bail!("Unknown HitPay order reference.");
    }
    Ok(order_id)
}

fn env_value(key: &str) -> Option<String> {
    env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn resolve_environment(
    get: impl Fn(&str) -> Option<String>,
) -> Result<Option<ResolvedHitPayEnvironment>> {
    let mode = HitPayMode::parse(get("HITPAY_MODE").as_deref().unwrap_or("sandbox"))?;
    let generic_api_key = get("HITPAY_API_KEY");
    let generic_salt = get("HITPAY_WEBHOOK_SALT").or_else(|| get("HITPAY_SALT"));
    let sandbox_api_key = get("HITPAY_SANDBOX_API_KEY");
    let sandbox_salt = get("HITPAY_SANDBOX_WEBHOOK_SALT");
    let production_api_key = get("HITPAY_PRODUCTION_API_KEY");
    let production_salt = get("HITPAY_PRODUCTION_WEBHOOK_SALT");

    let (api_key, webhook_salt, api_base, configured_url) = match mode {
        HitPayMode::Sandbox => {
            if production_api_key.is_some() || production_salt.is_some() {
                bail!("Production HitPay credentials cannot be loaded in sandbox mode.");
            }
            (
                sandbox_api_key.or(generic_api_key),
                sandbox_salt.or(generic_salt),
                SANDBOX_API_BASE,
                get("HITPAY_SANDBOX_API_URL").or_else(|| get("HITPAY_API_URL")),
            )
        }
        HitPayMode::Production => {
            if generic_api_key.is_some()
                || generic_salt.is_some()
                || sandbox_api_key.is_some()
                || sandbox_salt.is_some()
                || get("HITPAY_SANDBOX_API_URL").is_some()
            {
                bail!("Sandbox or generic HitPay credentials cannot be loaded in production mode.");
            }
            (
                production_api_key,
                production_salt,
                PRODUCTION_API_BASE,
                get("HITPAY_PRODUCTION_API_URL").or_else(|| get("HITPAY_API_URL")),
            )
        }
    };

    if let Some(configured_url) = configured_url
        && configured_url.trim_end_matches('/') != api_base
    {
        bail!("HITPAY API URL does not match HITPAY_MODE.");
    }
    match (api_key, webhook_salt) {
        (None, None) => Ok(None),
        (Some(api_key), Some(webhook_salt)) => Ok(Some(ResolvedHitPayEnvironment {
            mode,
            api_key,
            webhook_salt,
            api_base,
        })),
        _ => bail!("HitPay API key and webhook salt must be configured together."),
    }
}

fn validate_redirect_url(value: &str, mode: HitPayMode) -> Result<()> {
    let url = Url::parse(value).context("HITPAY_REDIRECT_URL is not a valid URL")?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        bail!("HITPAY_REDIRECT_URL must be an absolute HTTP or HTTPS URL.");
    }
    if mode == HitPayMode::Production && url.scheme() != "https" {
        bail!("HITPAY_REDIRECT_URL must use HTTPS in production mode.");
    }
    Ok(())
}

fn decode_hex(value: &str) -> Result<Vec<u8>> {
    if value.len() != 64 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        bail!("Invalid HitPay webhook signature.");
    }
    value
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let text = std::str::from_utf8(pair).expect("hex is ASCII");
            u8::from_str_radix(text, 16).map_err(|_| anyhow!("Invalid HitPay webhook signature."))
        })
        .collect()
}

fn sha256_hex(value: &[u8]) -> String {
    let bytes = Sha256::digest(value);
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(output, "{byte:02x}");
    }
    output
}

#[cfg(test)]
mod tests {
    use std::{
        collections::HashMap,
        sync::{
            Arc,
            atomic::{AtomicUsize, Ordering},
        },
    };

    use axum::{
        Json, Router,
        body::Body,
        http::{Request, StatusCode},
        routing::{get, post},
    };
    use serde_json::{Value, json};
    use tower::ServiceExt;

    use crate::{
        app_state::AppState,
        models::{CreateOrderInput, CreateOrderItemInput},
        routes,
    };

    use super::*;

    async fn mock_server(router: Router) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("mock listener");
        let address = listener.local_addr().expect("mock address");
        tokio::spawn(async move {
            axum::serve(listener, router).await.expect("mock server");
        });
        format!("http://{address}")
    }

    async fn create_test_order(pool: &PgPool, stock: i32) -> (Order, i32) {
        let product_id =
            sqlx::query_scalar::<_, i32>("SELECT id FROM products ORDER BY id LIMIT 1")
                .fetch_one(pool)
                .await
                .expect("seed product");
        sqlx::query("UPDATE products SET price_cents = 1000, stock_quantity = $1 WHERE id = $2")
            .bind(stock)
            .bind(product_id)
            .execute(pool)
            .await
            .expect("set stock");
        let order = crate::modules::orders::service::create_order(
            pool,
            "test",
            &CreateOrderInput {
                customer_name: "Sandbox Buyer".to_string(),
                customer_email: "buyer@example.com".to_string(),
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
            None,
        )
        .await
        .expect("test order");
        (order, product_id)
    }

    async fn setup_pending(pool: &PgPool, stock: i32) -> (Order, i32, i32, String) {
        let (order, product_id) = create_test_order(pool, stock).await;
        let reference = provider_order_id(order.id).expect("reference");
        let request_id = format!("request-{}", order.id);
        db::begin_gateway_payment_with_currency(
            pool,
            PROVIDER,
            order.id,
            &reference,
            order.total_cents,
            "MYR",
        )
        .await
        .expect("begin payment");
        db::bind_gateway_payment_request(
            pool,
            PROVIDER,
            &reference,
            &request_id,
            order.total_cents,
            "MYR",
        )
        .await
        .expect("bind request");
        let payment_id = sqlx::query_scalar::<_, i32>(
            "SELECT id FROM payments WHERE provider = 'hitpay' AND provider_request_id = $1",
        )
        .bind(&request_id)
        .fetch_one(pool)
        .await
        .expect("payment id");
        (order, product_id, payment_id, request_id)
    }

    fn payment_payload(
        order: &Order,
        request_id: &str,
        payment_id: &str,
        status: &str,
        amount: &str,
        currency: &str,
        reference: Option<&str>,
    ) -> Vec<u8> {
        let child_status = if status == "completed" {
            "succeeded"
        } else {
            "failed"
        };
        serde_json::to_vec(&json!({
            "id": request_id,
            "amount": amount,
            "currency": currency,
            "status": status,
            "reference_number": reference.map(str::to_string).unwrap_or_else(|| format!("EKW-{}", order.id)),
            "payments": [{
                "id": payment_id,
                "status": child_status,
                "amount": amount,
                "currency": currency,
                "status_reason": if status == "failed" { "Card declined" } else { "" }
            }]
        }))
        .expect("payload")
    }

    fn signature(config: &HitPayConfig, payload: &[u8]) -> String {
        let mut mac = HmacSha256::new_from_slice(config.webhook_salt.as_bytes()).expect("HMAC");
        mac.update(payload);
        let bytes = mac.finalize().into_bytes();
        let mut output = String::new();
        for byte in bytes {
            let _ = write!(output, "{byte:02x}");
        }
        output
    }

    async fn send_event(
        pool: &PgPool,
        config: &HitPayConfig,
        payload: &[u8],
        event_type: &str,
    ) -> Result<db::GatewayEventOutcome> {
        process_webhook(
            pool,
            config,
            &signature(config, payload),
            event_type,
            "payment_request",
            payload,
        )
        .await
    }

    async fn captured_payment(pool: &PgPool) -> (Order, i32, i32, String, HitPayConfig) {
        let (order, product_id, payment_id, request_id) = setup_pending(pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-success",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        send_event(pool, &config, &payload, "completed")
            .await
            .expect("capture");
        (order, product_id, payment_id, request_id, config)
    }

    #[sqlx::test]
    async fn successful_sandbox_hosted_payment_request_is_provider_neutral(pool: PgPool) {
        let (order, _) = create_test_order(&pool, 5).await;
        let body = json!({
            "id": format!("request-{}", order.id),
            "amount": "10.00",
            "currency": "MYR",
            "status": "pending",
            "reference_number": format!("EKW-{}", order.id),
            "url": format!("https://securecheckout.sandbox.hit-pay.com/payment-request/test/{}/checkout", order.id)
        });
        let api_base = mock_server(Router::new().route(
            "/v1/payment-requests",
            post(move || {
                let body = body.clone();
                async move { Json(body) }
            }),
        ))
        .await;
        let checkout = start_checkout(&pool, &HitPayConfig::test_config(api_base), order)
            .await
            .expect("sandbox checkout");
        let serialized = serde_json::to_value(checkout).expect("serialize");
        assert_eq!(serialized["provider"], "hitpay");
        assert!(serialized.get("api_key").is_none());
        assert!(serialized.get("payment_request_id").is_none());
    }

    #[test]
    fn current_and_legacy_official_sandbox_checkout_hosts_are_accepted() {
        for host in SANDBOX_CHECKOUT_HOSTS {
            let response = HitPayPaymentRequest {
                id: "request-host-check".to_string(),
                amount: json!("10.00"),
                currency: "MYR".to_string(),
                status: "pending".to_string(),
                reference_number: "EKW-1".to_string(),
                url: format!(
                    "https://{host}/payment-request/@ekoway-hardware/request-host-check/checkout"
                ),
                payments: Vec::new(),
            };
            validate_created_request(&response, "EKW-1", 1000, HitPayMode::Sandbox)
                .expect("official sandbox host");
        }

        let response = HitPayPaymentRequest {
            id: "request-host-check".to_string(),
            amount: json!("10.00"),
            currency: "MYR".to_string(),
            status: "pending".to_string(),
            reference_number: "EKW-1".to_string(),
            url: "https://checkout.hit-pay.example/payment/request-host-check".to_string(),
            payments: Vec::new(),
        };
        assert!(validate_created_request(&response, "EKW-1", 1000, HitPayMode::Sandbox).is_err());
    }

    #[test]
    fn production_checkout_hosts_are_official_and_never_sandbox() {
        assert!(checkout_host_is_allowed(
            HitPayMode::Production,
            "checkout.hit-pay.com"
        ));
        assert!(checkout_host_is_allowed(
            HitPayMode::Production,
            "securecheckout.hit-pay.com"
        ));
        assert!(!checkout_host_is_allowed(
            HitPayMode::Production,
            "checkout.sandbox.hit-pay.com"
        ));
        assert!(!checkout_host_is_allowed(
            HitPayMode::Production,
            "checkout.hit-pay.example"
        ));
    }

    #[test]
    fn mode_specific_credentials_cannot_be_mixed() {
        let resolve = |pairs: &[(&str, &str)]| {
            let values = pairs
                .iter()
                .map(|(key, value)| ((*key).to_string(), (*value).to_string()))
                .collect::<HashMap<_, _>>();
            resolve_environment(|key| values.get(key).cloned())
        };

        let sandbox = resolve(&[
            ("HITPAY_MODE", "sandbox"),
            ("HITPAY_API_KEY", "sandbox-key"),
            ("HITPAY_WEBHOOK_SALT", "sandbox-salt"),
        ])
        .expect("legacy sandbox credentials remain compatible")
        .expect("sandbox config");
        assert_eq!(sandbox.mode, HitPayMode::Sandbox);
        assert_eq!(sandbox.api_base, SANDBOX_API_BASE);

        let production = resolve(&[
            ("HITPAY_MODE", "production"),
            ("HITPAY_PRODUCTION_API_KEY", "production-key"),
            ("HITPAY_PRODUCTION_WEBHOOK_SALT", "production-salt"),
        ])
        .expect("production config")
        .expect("production credentials");
        assert_eq!(production.mode, HitPayMode::Production);
        assert_eq!(production.api_base, PRODUCTION_API_BASE);

        assert!(
            resolve(&[
                ("HITPAY_MODE", "production"),
                ("HITPAY_API_KEY", "ambiguous-key"),
                ("HITPAY_WEBHOOK_SALT", "ambiguous-salt"),
                ("HITPAY_PRODUCTION_API_KEY", "production-key"),
                ("HITPAY_PRODUCTION_WEBHOOK_SALT", "production-salt"),
            ])
            .is_err()
        );
        assert!(
            resolve(&[
                ("HITPAY_MODE", "sandbox"),
                ("HITPAY_SANDBOX_API_KEY", "sandbox-key"),
                ("HITPAY_SANDBOX_WEBHOOK_SALT", "sandbox-salt"),
                ("HITPAY_PRODUCTION_API_KEY", "production-key"),
            ])
            .is_err()
        );
        assert!(
            resolve(&[
                ("HITPAY_MODE", "production"),
                ("HITPAY_PRODUCTION_API_KEY", "production-key"),
                ("HITPAY_PRODUCTION_WEBHOOK_SALT", "production-salt"),
                ("HITPAY_PRODUCTION_API_URL", SANDBOX_API_BASE),
            ])
            .is_err()
        );
        assert!(
            validate_redirect_url("http://example.com/return", HitPayMode::Production).is_err()
        );
        assert!(
            validate_redirect_url("https://example.com/return", HitPayMode::Production).is_ok()
        );
    }

    #[sqlx::test]
    async fn failed_declined_payment_releases_reserved_stock(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-failed",
            "failed",
            "10.00",
            "MYR",
            None,
        );
        send_event(&pool, &config, &payload, "failed")
            .await
            .expect("failed event");
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Failed"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 5);
    }

    #[sqlx::test]
    async fn abandoned_checkout_releases_after_default_sixty_minutes(pool: PgPool) {
        let (order, product_id, _, _) = setup_pending(&pool, 5).await;
        let minutes = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'inventory.unpaid_release_minutes'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(minutes, "60");
        sqlx::query("UPDATE orders SET created_at = now() - interval '61 minutes' WHERE id = $1")
            .bind(order.id)
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(db::release_abandoned_order_stock(&pool).await.unwrap(), 1);
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 5);
    }

    #[sqlx::test]
    async fn spoofed_manual_return_url_cannot_change_payment(pool: PgPool) {
        let (_, _, payment_id, _) = setup_pending(&pool, 5).await;
        let app = routes::build_router(
            AppState::new(pool.clone()),
            "http://localhost:5173".parse().unwrap(),
        );
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/payments/hitpay/return?status=completed&reference=fake")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Pending"
        );
    }

    #[sqlx::test]
    async fn invalid_webhook_signature_fails_without_mutation(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-success",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        assert!(
            process_webhook(
                &pool,
                &config,
                &"00".repeat(32),
                "completed",
                "payment_request",
                &payload
            )
            .await
            .is_err()
        );
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Pending"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4);
    }

    #[sqlx::test]
    async fn duplicate_webhook_creates_one_capture_and_one_event(pool: PgPool) {
        let (order, _, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-success",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        assert_eq!(
            send_event(&pool, &config, &payload, "completed")
                .await
                .unwrap(),
            db::GatewayEventOutcome::Applied
        );
        assert_eq!(
            send_event(&pool, &config, &payload, "completed")
                .await
                .unwrap(),
            db::GatewayEventOutcome::Duplicate
        );
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payment_gateway_events WHERE payment_id = $1",
        )
        .bind(payment_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[sqlx::test]
    async fn out_of_order_failed_then_completed_event_recovers_safely(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let failed = payment_payload(
            &order,
            &request_id,
            "payment-failed",
            "failed",
            "10.00",
            "MYR",
            None,
        );
        let completed = payment_payload(
            &order,
            &request_id,
            "payment-success",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        send_event(&pool, &config, &failed, "failed").await.unwrap();
        send_event(&pool, &config, &completed, "completed")
            .await
            .unwrap();
        let stale_failed = payment_payload(
            &order,
            &request_id,
            "another-failed-attempt",
            "failed",
            "10.00",
            "MYR",
            None,
        );
        send_event(&pool, &config, &stale_failed, "failed")
            .await
            .unwrap();
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Captured"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4);
    }

    #[sqlx::test]
    async fn inconsistent_amount_currency_reference_and_unknown_request_fail_closed(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let cases = [
            payment_payload(&order, &request_id, "p1", "completed", "9.99", "MYR", None),
            payment_payload(&order, &request_id, "p2", "completed", "10.00", "SGD", None),
            payment_payload(
                &order,
                &request_id,
                "p3",
                "completed",
                "10.00",
                "MYR",
                Some("EKW-999999"),
            ),
            payment_payload(
                &order,
                "unknown-request",
                "p4",
                "completed",
                "10.00",
                "MYR",
                None,
            ),
        ];
        for payload in cases {
            assert!(
                send_event(&pool, &config, &payload, "completed")
                    .await
                    .is_err()
            );
        }
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Pending"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4);
    }

    #[sqlx::test]
    async fn unknown_or_changed_provider_payment_id_fails_closed(pool: PgPool) {
        let (order, _, payment_id, request_id) = setup_pending(&pool, 5).await;
        sqlx::query("UPDATE payments SET provider_payment_id = 'known-payment' WHERE id = $1")
            .bind(payment_id)
            .execute(&pool)
            .await
            .unwrap();
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "different-payment",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        assert!(
            send_event(&pool, &config, &payload, "completed")
                .await
                .is_err()
        );
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Pending"
        );
    }

    #[sqlx::test]
    async fn valid_late_payment_after_stock_release_reacquires_inventory(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        sqlx::query("UPDATE orders SET created_at = now() - interval '61 minutes' WHERE id = $1")
            .bind(order.id)
            .execute(&pool)
            .await
            .unwrap();
        db::release_abandoned_order_stock(&pool).await.unwrap();
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-late",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        send_event(&pool, &config, &payload, "completed")
            .await
            .unwrap();
        let payment = db::fetch_gateway_payment(&pool, payment_id).await.unwrap();
        assert_eq!(payment.status, "Captured");
        assert!(payment.provider_payment_id == "payment-late");
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4);
    }

    #[sqlx::test]
    async fn late_payment_stock_shortfall_is_paid_audited_and_never_negative(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 1).await;
        sqlx::query("UPDATE orders SET created_at = now() - interval '61 minutes' WHERE id = $1")
            .bind(order.id)
            .execute(&pool)
            .await
            .unwrap();
        db::release_abandoned_order_stock(&pool).await.unwrap();
        let _other = create_test_order(&pool, 1).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-late",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        send_event(&pool, &config, &payload, "completed")
            .await
            .unwrap();
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Captured"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 0);
        let exceptions = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payment_stock_exceptions WHERE payment_id = $1",
        )
        .bind(payment_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(exceptions, 1);
    }

    #[sqlx::test]
    async fn reconciliation_is_explicit_fallback_and_captures_verified_status(pool: PgPool) {
        let (order, _, payment_id, request_id) = setup_pending(&pool, 5).await;
        let body = json!({
            "id": request_id,
            "amount": "10.00",
            "currency": "MYR",
            "status": "completed",
            "reference_number": format!("EKW-{}", order.id),
            "payments": [{
                "id":"reconciled-payment",
                "status":"succeeded",
                "amount":"10.00",
                "currency":"MYR",
                "status_reason": "",
                "status_reason_code": null
            }]
        });
        let api_base = mock_server(Router::new().route(
            "/v1/payment-requests/{id}",
            get(move || {
                let body = body.clone();
                async move { Json(body) }
            }),
        ))
        .await;
        let result = reconcile_payment(&pool, &HitPayConfig::test_config(api_base), payment_id)
            .await
            .expect("reconcile");
        assert!(result.changed);
        assert_eq!(result.status, "Captured");
    }

    #[sqlx::test]
    async fn successful_full_and_duplicate_refund_are_idempotent(pool: PgPool) {
        let (_, _, payment_id, _, _) = captured_payment(&pool).await;
        let calls = Arc::new(AtomicUsize::new(0));
        let response_calls = calls.clone();
        let api_base = mock_server(Router::new().route(
            "/v1/refund",
            post(move || { let calls = response_calls.clone(); async move {
                calls.fetch_add(1, Ordering::SeqCst);
                Json(json!({"id":"refund-1","payment_id":"payment-success","amount_refunded":"10.00","currency":"MYR","status":"succeeded"}))
            }}),
        )).await;
        let config = HitPayConfig::test_config(api_base);
        let input = GatewayRefundInput {
            payment_id,
            amount_cents: None,
            idempotency_key: "refund-key-1".to_string(),
            requested_by: "admin".to_string(),
        };
        let first = refund_payment(&pool, &config, input.clone())
            .await
            .expect("refund");
        let second = refund_payment(&pool, &config, input)
            .await
            .expect("duplicate");
        assert!(!first.duplicate && second.duplicate);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Refunded"
        );
    }

    #[sqlx::test]
    async fn partial_refund_keeps_capture_and_is_auditable(pool: PgPool) {
        let (_, _, payment_id, _, _) = captured_payment(&pool).await;
        let api_base = mock_server(Router::new().route(
            "/v1/refund",
            post(|| async { Json(json!({"id":"refund-partial","payment_id":"payment-success","amount_refunded":"4.00","currency":"MYR","status":"succeeded"})) }),
        )).await;
        refund_payment(
            &pool,
            &HitPayConfig::test_config(api_base),
            GatewayRefundInput {
                payment_id,
                amount_cents: Some(400),
                idempotency_key: "partial-1".to_string(),
                requested_by: "admin".to_string(),
            },
        )
        .await
        .expect("partial refund");
        let payment = db::fetch_gateway_payment(&pool, payment_id).await.unwrap();
        assert_eq!(payment.status, "Captured");
        assert_eq!(payment.amount_refunded_cents, 400);
    }

    #[sqlx::test]
    async fn failed_refund_does_not_change_captured_payment_state(pool: PgPool) {
        let (_, _, payment_id, _, _) = captured_payment(&pool).await;
        let api_base = mock_server(Router::new().route(
            "/v1/refund",
            post(|| async {
                (
                    StatusCode::UNPROCESSABLE_ENTITY,
                    Json(json!({"message":"declined"})),
                )
            }),
        ))
        .await;
        let result = refund_payment(
            &pool,
            &HitPayConfig::test_config(api_base),
            GatewayRefundInput {
                payment_id,
                amount_cents: None,
                idempotency_key: "failed-1".to_string(),
                requested_by: "admin".to_string(),
            },
        )
        .await;
        assert!(result.is_err());
        let payment = db::fetch_gateway_payment(&pool, payment_id).await.unwrap();
        assert_eq!(payment.status, "Captured");
        assert_eq!(payment.amount_refunded_cents, 0);
    }

    #[sqlx::test]
    async fn concurrent_duplicate_capture_is_race_safe(pool: PgPool) {
        let (order, product_id, payment_id, request_id) = setup_pending(&pool, 5).await;
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let payload = payment_payload(
            &order,
            &request_id,
            "payment-race",
            "completed",
            "10.00",
            "MYR",
            None,
        );
        let (left, right) = tokio::join!(
            send_event(&pool, &config, &payload, "completed"),
            send_event(&pool, &config, &payload, "completed")
        );
        assert!(left.is_ok() && right.is_ok());
        assert_eq!(
            db::fetch_gateway_payment(&pool, payment_id)
                .await
                .unwrap()
                .status,
            "Captured"
        );
        let stock =
            sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
                .bind(product_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stock, 4);
    }

    #[test]
    fn raw_body_signature_and_money_parser_are_strict() {
        let config = HitPayConfig::test_config("http://127.0.0.1:1".to_string());
        let raw = br#"{"amount":"10.00"}"#;
        let signed = signature(&config, raw);
        config
            .verify_webhook_signature(raw, &signed)
            .expect("exact body");
        assert!(
            config
                .verify_webhook_signature(br#"{ "amount":"10.00"}"#, &signed)
                .is_err()
        );
        assert_eq!(
            money_to_cents(&Value::String("10.00".to_string())).unwrap(),
            1000
        );
        assert!(money_to_cents(&Value::String("10.001".to_string())).is_err());
    }
}
