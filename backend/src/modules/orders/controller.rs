use std::env;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};

use crate::{
    app_state::AppState,
    error,
    models::Paged,
    modules::{
        auth::model::AdminIdentity, customer_auth::model::CustomerIdentity, payments::activation,
        permissions,
    },
};

use super::{
    dto::{
        AdminListQuery, CheckoutQuote, CheckoutQuoteInput, CreateOrderInput,
        UpdateOrderFulfillmentInput,
    },
    model::Order,
    service,
};

pub async fn admin_orders(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Query(query): Query<AdminListQuery>,
) -> Result<Json<Paged<Order>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_ORDERS_PAGE,
        permissions::model::PermissionAction::Read,
        "order",
    )
    .await?;

    service::fetch_orders(&state.pool, query.limit, query.before)
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
        .map(|order| {
            // Fire-and-forget: a confirmation email that cannot be sent must never fail the
            // order it confirms.
            state
                .emailer
                .spawn_order_confirmation(state.pool.clone(), &order);
            (StatusCode::CREATED, Json(order))
        })
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
    // Same server-side gate as the secure checkout route: in `disabled` or `controlled` mode this
    // legacy route must not create orders or hold stock either, so a deployment that mis-sets
    // APP_ENV cannot reopen a bypass around the payment activation gate. `public` mode keeps the
    // historical local-development behavior below.
    match state.payment_activation_mode {
        activation::PaymentActivationMode::Disabled
        | activation::PaymentActivationMode::Controlled => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                activation::GATE_REJECTION_MESSAGE.to_string(),
            ));
        }
        activation::PaymentActivationMode::Public => {}
    }

    // The shopper UI uses the gateway-backed checkout route. Keep this compatibility route
    // available for local development and integration tests, but never let a public production
    // deployment reserve stock without collecting payment.
    if env::var("APP_ENV")
        .map(|value| value.eq_ignore_ascii_case("production"))
        .unwrap_or(false)
    {
        return Err((
            StatusCode::GONE,
            "This checkout route is unavailable. Please use the secure checkout.".to_string(),
        ));
    }

    let customer_account_id = identity.map(|identity| identity.customer_account_id);
    service::create_order(&state.pool, "customer", &input, customer_account_id)
        .await
        .map(|order| {
            state
                .emailer
                .spawn_order_confirmation(state.pool.clone(), &order);
            (StatusCode::CREATED, Json(order))
        })
        .map_err(error::map_admin_error)
}

pub async fn quote(
    State(state): State<AppState>,
    Json(input): Json<CheckoutQuoteInput>,
) -> Result<Json<CheckoutQuote>, error::HttpError> {
    service::quote(&state.pool, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
