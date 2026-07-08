use axum::{
    Json,
    extract::{Path, Query, State},
};

use crate::{
    app_state::AppState,
    error,
    models::Paged,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{
    dto::{AdminListQuery, UpdateSalesDetailsInput, UpdateSalesStatusInput},
    model::{SalesRecord, SalesSummaryPayload},
    service,
};

pub async fn admin_sales(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Query(query): Query<AdminListQuery>,
) -> Result<Json<Paged<SalesRecord>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SALES_PAGE,
        permissions::model::PermissionAction::Read,
        "sale",
    )
    .await?;

    service::fetch_sales(&state.pool, query.limit, query.before)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin sales query failed", error))
}

pub async fn admin_sales_summary(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<SalesSummaryPayload>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SALES_PAGE,
        permissions::model::PermissionAction::Read,
        "sale",
    )
    .await?;

    service::fetch_sales_summary(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin sales summary query failed", error))
}

pub async fn admin_update_sales_details(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateSalesDetailsInput>,
) -> Result<Json<SalesRecord>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SALES_PAGE,
        permissions::model::PermissionAction::Update,
        "sale",
    )
    .await?;

    service::update_sales_details(&state.pool, &identity, order_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_update_sales_status(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateSalesStatusInput>,
) -> Result<Json<SalesRecord>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SALES_PAGE,
        permissions::model::PermissionAction::Update,
        "sale",
    )
    .await?;

    service::update_sales_status(&state.pool, &identity, order_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
