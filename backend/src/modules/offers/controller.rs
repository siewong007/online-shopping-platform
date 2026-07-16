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
    dto::{CreatePromotionInput, CreateVoucherInput, UpdatePromotionInput, UpdateVoucherInput},
    model::{Promotion, Voucher},
    service,
};

pub async fn admin_promotions(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<Promotion>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Read,
        "promotion",
    )
    .await?;

    service::fetch_promotions(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin promotions query failed", error))
}

pub async fn create_promotion(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreatePromotionInput>,
) -> Result<(StatusCode, Json<Promotion>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Create,
        "promotion",
    )
    .await?;

    service::create_promotion(&state.pool, &identity, &input)
        .await
        .map(|promotion| (StatusCode::CREATED, Json(promotion)))
        .map_err(error::map_admin_error)
}

pub async fn update_promotion(
    State(state): State<AppState>,
    Path(promotion_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdatePromotionInput>,
) -> Result<Json<Promotion>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Update,
        "promotion",
    )
    .await?;

    service::update_promotion(&state.pool, &identity, promotion_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_promotion(
    State(state): State<AppState>,
    Path(promotion_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Delete,
        "promotion",
    )
    .await?;

    service::delete_promotion(&state.pool, &identity, promotion_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn admin_vouchers(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<Voucher>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Read,
        "voucher",
    )
    .await?;

    service::fetch_vouchers(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin vouchers query failed", error))
}

pub async fn create_voucher(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateVoucherInput>,
) -> Result<(StatusCode, Json<Voucher>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Create,
        "voucher",
    )
    .await?;

    service::create_voucher(&state.pool, &identity, &input)
        .await
        .map(|voucher| (StatusCode::CREATED, Json(voucher)))
        .map_err(error::map_admin_error)
}

pub async fn update_voucher(
    State(state): State<AppState>,
    Path(voucher_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateVoucherInput>,
) -> Result<Json<Voucher>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Update,
        "voucher",
    )
    .await?;

    service::update_voucher(&state.pool, &identity, voucher_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_voucher(
    State(state): State<AppState>,
    Path(voucher_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CAMPAIGNS_PAGE,
        permissions::model::PermissionAction::Delete,
        "voucher",
    )
    .await?;

    service::delete_voucher(&state.pool, &identity, voucher_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}
