use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, customer_auth::model::CustomerIdentity, permissions},
};

use super::{
    dto::{CreateOrderInput, UpdateOrderFulfillmentInput},
    model::Order,
    service,
};

pub async fn admin_orders(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<Order>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Read,
        "order",
    )
    .await?;

    service::fetch_orders(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin orders query failed", error))
}

pub async fn admin_create_order(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<Order>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Create,
        "order",
    )
    .await?;

    service::create_order(&state.pool, &identity.username, &input, None)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(error::map_admin_error)
}

pub async fn admin_update_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<CreateOrderInput>,
) -> Result<Json<Order>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Update,
        "order",
    )
    .await?;

    service::update_order(&state.pool, &identity, order_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_delete_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Delete,
        "order",
    )
    .await?;

    service::delete_order(&state.pool, &identity, order_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn admin_update_order_fulfillment(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateOrderFulfillmentInput>,
) -> Result<Json<Order>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Update,
        "order",
    )
    .await?;

    service::update_order_fulfillment(&state.pool, order_id, &input, &identity.username)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn checkout(
    State(state): State<AppState>,
    identity: Option<CustomerIdentity>,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<Order>), error::HttpError> {
    let customer_account_id = identity.map(|identity| identity.customer_account_id);
    service::create_order(&state.pool, "customer", &input, customer_account_id)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(error::map_admin_error)
}
