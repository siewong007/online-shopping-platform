use axum::{
    Json,
    body::Bytes,
    extract::{Form, Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, customer_auth::model::CustomerIdentity, permissions},
};

use super::{
    activation,
    dto::{
        CreateActivationGrantInput, CreatePaymentInput, IssuedActivationGrant, RefundPaymentInput,
        UpdatePaymentInput,
    },
    gateway::{self, GatewayReconciliationResult, GatewayRefundResult, PaymentCheckout},
    hitpay::HitPayConfig,
    model::Payment,
    senangpay::{SenangPayCallback, SenangPayConfig},
    service,
};

pub async fn hitpay_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<&'static str, error::HttpError> {
    let signature = headers
        .get("Hitpay-Signature")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Missing payment signature.".to_string(),
            )
        })?;
    let event_type = headers
        .get("Hitpay-Event-Type")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Missing payment event type.".to_string(),
            )
        })?;
    let event_object = headers
        .get("Hitpay-Event-Object")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Missing payment event object.".to_string(),
            )
        })?;
    let config = HitPayConfig::from_environment()
        .map_err(|config_error| {
            tracing::error!(%config_error, "HitPay webhook configuration is invalid");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "Payment webhook is not configured.".to_string(),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "Payment webhook is not configured.".to_string(),
            )
        })?;

    let outcome = super::hitpay::process_webhook(
        &state.pool,
        &config,
        signature,
        event_type,
        event_object,
        &body,
    )
    .await
    .map_err(|webhook_error| {
        tracing::warn!(%webhook_error, "HitPay webhook rejected");
        (
            StatusCode::BAD_REQUEST,
            "Payment webhook rejected.".to_string(),
        )
    })?;
    if let Some(order_id) = outcome.newly_captured_order_id {
        state
            .emailer
            .enqueue_payment_captured(&state.pool, order_id)
            .await;
    }
    Ok("OK")
}

pub async fn checkout_with_gateway(
    State(state): State<AppState>,
    identity: Option<CustomerIdentity>,
    headers: HeaderMap,
    Json(input): Json<crate::models::CreateOrderInput>,
) -> Result<(StatusCode, Json<PaymentCheckout>), error::HttpError> {
    // The gate runs first and owns provider resolution, so nothing below it can execute until the
    // deployment's activation mode has admitted this specific request.
    let (gateway, approval) =
        activation::authorize_checkout(&state, &headers, gateway::configured_gateway()).await?;

    let customer_account_id = identity.map(|identity| identity.customer_account_id);
    let checkout = service::start_gateway_checkout(
        &state.pool,
        gateway.as_ref(),
        &input,
        customer_account_id,
        &approval,
        Some(&state.emailer),
    )
    .await
    .map_err(error::map_admin_error)?;

    activation::record_authorized_checkout(&state.pool, &approval, checkout.order.id).await;

    Ok((StatusCode::CREATED, Json(checkout)))
}

/// Issuing a live-payment authorization is a narrower privilege than payment-ledger maintenance,
/// so it is restricted to the super admin rather than to everyone holding `admin-payments`
/// create rights. There is deliberately no self-service, listing or revocation surface.
pub async fn admin_create_activation_grant(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateActivationGrantInput>,
) -> Result<(StatusCode, Json<IssuedActivationGrant>), error::HttpError> {
    if !identity.is_super_admin {
        return Err((
            StatusCode::FORBIDDEN,
            "Only a super admin can issue a payment activation authorization.".to_string(),
        ));
    }

    activation::issue_grant(&state.pool, &identity, &input)
        .await
        .map(|grant| (StatusCode::CREATED, Json(grant)))
        .map_err(error::map_admin_error)
}

pub async fn senangpay_callback(
    State(state): State<AppState>,
    Form(callback): Form<SenangPayCallback>,
) -> Result<&'static str, error::HttpError> {
    let config = SenangPayConfig::from_environment()
        .map_err(|error| {
            tracing::error!(%error, "senangPay callback configuration is invalid");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "Payment callback is not configured.".to_string(),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "Payment callback is not configured.".to_string(),
            )
        })?;

    let newly_captured_order_id =
        super::senangpay::process_callback(&state.pool, &config, &callback)
            .await
            .map_err(error::map_admin_error)?;
    if let Some(order_id) = newly_captured_order_id {
        state
            .emailer
            .enqueue_payment_captured(&state.pool, order_id)
            .await;
    }
    Ok("OK")
}

pub async fn admin_payments(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<Payment>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Read,
        "payment",
    )
    .await?;

    service::fetch_payments(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin payments query failed", error))
}

pub async fn admin_create_payment(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreatePaymentInput>,
) -> Result<(StatusCode, Json<Payment>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Create,
        "payment",
    )
    .await?;

    service::create_payment(&state.pool, &identity, &input)
        .await
        .map(|payment| (StatusCode::CREATED, Json(payment)))
        .map_err(error::map_admin_error)
}

pub async fn admin_update_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdatePaymentInput>,
) -> Result<Json<Payment>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Update,
        "payment",
    )
    .await?;

    service::update_payment(&state.pool, &identity, payment_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_delete_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Delete,
        "payment",
    )
    .await?;

    service::delete_payment(&state.pool, &identity, payment_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn admin_reconcile_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<Json<GatewayReconciliationResult>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Update,
        "payment",
    )
    .await?;
    service::reconcile_gateway_payment(&state.pool, &identity, payment_id, Some(&state.emailer))
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_refund_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<RefundPaymentInput>,
) -> Result<Json<GatewayRefundResult>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_PAYMENTS_PAGE,
        permissions::model::PermissionAction::Update,
        "payment",
    )
    .await?;
    service::refund_gateway_payment(
        &state.pool,
        &identity,
        payment_id,
        &input,
        Some(&state.emailer),
    )
    .await
    .map(Json)
    .map_err(error::map_admin_error)
}
