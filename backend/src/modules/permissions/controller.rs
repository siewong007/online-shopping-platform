use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{app_state::AppState, error, modules::auth::model::AdminIdentity};

use super::{
    dto::{CreateRoleInput, PermissionsPayload, UpdateRoleInput, UpdateRolePagePermissionInput},
    model::{self, PermissionAction, Role, RolePagePermission},
    service,
};

pub async fn admin_permissions(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<PermissionsPayload>, error::HttpError> {
    service::ensure_permission(
        &state.pool,
        &identity,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Read,
        "permission",
    )
    .await?;

    service::fetch_permissions(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("permissions query failed", error))
}

pub async fn create_role(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateRoleInput>,
) -> Result<(StatusCode, Json<Role>), error::HttpError> {
    service::ensure_permission(
        &state.pool,
        &identity,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Create,
        "permission",
    )
    .await?;

    service::create_role(&state.pool, &identity, &input)
        .await
        .map(|role| (StatusCode::CREATED, Json(role)))
        .map_err(error::map_admin_error)
}

pub async fn update_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateRoleInput>,
) -> Result<Json<Role>, error::HttpError> {
    service::ensure_permission(
        &state.pool,
        &identity,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Update,
        "permission",
    )
    .await?;

    service::update_role(&state.pool, &identity, role_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<StatusCode, error::HttpError> {
    service::ensure_permission(
        &state.pool,
        &identity,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Delete,
        "permission",
    )
    .await?;

    service::delete_role(&state.pool, &identity, role_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn update_role_permission(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<UpdateRolePagePermissionInput>,
) -> Result<Json<RolePagePermission>, error::HttpError> {
    service::ensure_permission(
        &state.pool,
        &identity,
        model::ADMIN_PERMISSIONS_PAGE,
        PermissionAction::Update,
        "permission",
    )
    .await?;

    service::update_role_page_permission(&state.pool, &identity, &input)
        .await
        .map(Json)
}
