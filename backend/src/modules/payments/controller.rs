use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{
    dto::{CreatePaymentInput, UpdatePaymentInput},
    model::Payment,
    service,
};

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
