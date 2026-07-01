use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error, modules::permissions};

use super::{dto::CreateOrderInput, model::Order, service};

pub async fn admin_orders(State(state): State<AppState>) -> Result<Json<Vec<Order>>, StatusCode> {
    service::fetch_orders(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("admin orders query failed", error))
}

pub async fn admin_create_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<Order>), error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Create,
        "order",
    )
    .await?;

    service::create_order(&state.pool, &input)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(error::map_admin_error)
}

pub async fn admin_update_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<CreateOrderInput>,
) -> Result<Json<Order>, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Update,
        "order",
    )
    .await?;

    service::update_order(&state.pool, order_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_delete_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Delete,
        "order",
    )
    .await?;

    service::delete_order(&state.pool, order_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn checkout(
    State(state): State<AppState>,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<Order>), error::HttpError> {
    service::create_order(&state.pool, &input)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(error::map_admin_error)
}
