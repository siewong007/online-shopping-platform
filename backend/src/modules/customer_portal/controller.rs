use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{
    dto::{
        CreateCustomerPortalProfileInput, CustomerLookupQuery, UpdateCustomerPortalProfileInput,
    },
    model::CustomerPortalProfile,
    service,
};

pub async fn lookup_customer_portal(
    State(state): State<AppState>,
    Query(query): Query<CustomerLookupQuery>,
) -> Result<Json<super::dto::CustomerLookupPayload>, error::HttpError> {
    let email = query.email.trim();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email is required.".to_string()));
    }

    if !email.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            "Email must be a valid address.".to_string(),
        ));
    }

    service::lookup_customer_portal(&state.pool, email)
        .await
        .map(Json)
        .map_err(|error| error::map_public_query_error("customer lookup query failed", error))
}

pub async fn customer_portal_profiles(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<CustomerPortalProfile>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Read,
        "customer",
    )
    .await?;

    service::fetch_customer_portal_profiles(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("customer portal query failed", error))
}

pub async fn create_customer_portal_profile(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateCustomerPortalProfileInput>,
) -> Result<(StatusCode, Json<CustomerPortalProfile>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Create,
        "customer",
    )
    .await?;

    service::create_customer_portal_profile(&state.pool, &identity, &input)
        .await
        .map(|profile| (StatusCode::CREATED, Json(profile)))
        .map_err(error::map_admin_error)
}

pub async fn update_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateCustomerPortalProfileInput>,
) -> Result<Json<CustomerPortalProfile>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Update,
        "customer",
    )
    .await?;

    service::update_customer_portal_profile(&state.pool, &identity, profile_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CUSTOMERS_PAGE,
        permissions::model::PermissionAction::Delete,
        "customer",
    )
    .await?;

    service::delete_customer_portal_profile(&state.pool, &identity, profile_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}
