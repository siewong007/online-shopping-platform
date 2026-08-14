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
    dto::{CreatePaymentInput, RefundPaymentInput, UpdatePaymentInput},
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

    super::hitpay::process_webhook(
        &state.pool,
        &config,
        signature,
        event_type,
        event_object,
        &body,
    )
    .await
    .map(|_| "OK")
    .map_err(|webhook_error| {
        tracing::warn!(%webhook_error, "HitPay webhook rejected");
        (
            StatusCode::BAD_REQUEST,
            "Payment webhook rejected.".to_string(),
        )
    })
}

pub async fn checkout_with_gateway(
    State(state): State<AppState>,
    identity: Option<CustomerIdentity>,
    Json(input): Json<crate::models::CreateOrderInput>,
) -> Result<(StatusCode, Json<PaymentCheckout>), error::HttpError> {
    let gateway = match gateway::configured_gateway() {
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

    let customer_account_id = identity.map(|identity| identity.customer_account_id);
    service::start_gateway_checkout(&state.pool, gateway.as_ref(), &input, customer_account_id)
        .await
        .map(|checkout| (StatusCode::CREATED, Json(checkout)))
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

    super::senangpay::process_callback(&state.pool, &config, &callback)
        .await
        .map(|()| "OK")
        .map_err(error::map_admin_error)
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
    service::reconcile_gateway_payment(&state.pool, &identity, payment_id)
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
    service::refund_gateway_payment(&state.pool, &identity, payment_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
