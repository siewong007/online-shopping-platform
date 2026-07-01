use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error};

use super::{
    dto::{CreateRoleInput, PermissionsPayload, UpdateRoleInput, UpdateRolePagePermissionInput},
    model::{self, PermissionAction, Role, RolePagePermission},
    service,
};

pub async fn admin_permissions(
    State(state): State<AppState>,
) -> Result<Json<PermissionsPayload>, StatusCode> {
    service::fetch_permissions(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("permissions query failed", error))
}

pub async fn create_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateRoleInput>,
) -> Result<(StatusCode, Json<Role>), error::HttpError> {
    service::ensure_admin_permission(
        &state.pool,
        &headers,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Create,
        "permission",
    )
    .await?;

    service::create_role(&state.pool, &input)
        .await
        .map(|role| (StatusCode::CREATED, Json(role)))
        .map_err(error::map_admin_error)
}

pub async fn update_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<UpdateRoleInput>,
) -> Result<Json<Role>, error::HttpError> {
    service::ensure_admin_permission(
        &state.pool,
        &headers,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Update,
        "permission",
    )
    .await?;

    service::update_role(&state.pool, role_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, error::HttpError> {
    service::ensure_admin_permission(
        &state.pool,
        &headers,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Delete,
        "permission",
    )
    .await?;

    service::delete_role(&state.pool, role_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn update_role_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateRolePagePermissionInput>,
) -> Result<Json<RolePagePermission>, error::HttpError> {
    service::ensure_admin_permission(
        &state.pool,
        &headers,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Update,
        "permission",
    )
    .await?;

    service::update_role_page_permission(&state.pool, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
