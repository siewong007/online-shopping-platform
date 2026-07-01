use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error, modules::permissions};

use super::{
    dto::{CreateCustomerPortalProfileInput, UpdateCustomerPortalProfileInput},
    model::CustomerPortalProfile,
    service,
};

pub async fn customer_portal_profiles(
    State(state): State<AppState>,
) -> Result<Json<Vec<CustomerPortalProfile>>, StatusCode> {
    service::fetch_customer_portal_profiles(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("customer portal query failed", error))
}

pub async fn create_customer_portal_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateCustomerPortalProfileInput>,
) -> Result<(StatusCode, Json<CustomerPortalProfile>), error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Create,
        "customer",
    )
    .await?;

    service::create_customer_portal_profile(&state.pool, &input)
        .await
        .map(|profile| (StatusCode::CREATED, Json(profile)))
        .map_err(error::map_admin_error)
}

pub async fn update_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<UpdateCustomerPortalProfileInput>,
) -> Result<Json<CustomerPortalProfile>, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Update,
        "customer",
    )
    .await?;

    service::update_customer_portal_profile(&state.pool, profile_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Delete,
        "customer",
    )
    .await?;

    service::delete_customer_portal_profile(&state.pool, profile_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}
