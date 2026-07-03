use anyhow::Result;
use axum::http::StatusCode;
use sqlx::PgPool;

use crate::{error::HttpError, modules::auth::model::AdminIdentity};

use super::{
    dto::{CreateRoleInput, PermissionsPayload, UpdateRoleInput, UpdateRolePagePermissionInput},
    model::{PermissionAction, Role, RolePagePermission},
    repository,
};

pub async fn fetch_permissions(pool: &PgPool) -> Result<PermissionsPayload> {
    repository::fetch_permissions(pool).await
}

pub async fn role_has_page_permission(
    pool: &PgPool,
    role_id: i32,
    page_slug: &str,
    action: PermissionAction,
) -> Result<bool> {
    repository::role_has_page_permission(pool, role_id, page_slug, action).await
}

pub async fn ensure_permission(
    pool: &PgPool,
    identity: &AdminIdentity,
    page_slug: &str,
    action: PermissionAction,
    resource_name: &str,
) -> Result<(), HttpError> {
    if identity.is_super_admin {
        return Ok(());
    }

    let is_allowed = role_has_page_permission(pool, identity.role_id, page_slug, action)
        .await
        .map_err(|error| {
            tracing::error!("permission lookup failed: {error:?}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unable to verify admin permissions.".to_string(),
            )
        })?;

    if is_allowed {
        Ok(())
    } else {
        Err((
            StatusCode::FORBIDDEN,
            format!("This admin role does not have enough {resource_name} privileges."),
        ))
    }
}

pub async fn create_role(pool: &PgPool, input: &CreateRoleInput) -> Result<Role> {
    repository::create_role(pool, input).await
}

pub async fn update_role(pool: &PgPool, role_id: i32, input: &UpdateRoleInput) -> Result<Role> {
    repository::update_role(pool, role_id, input).await
}

pub async fn delete_role(pool: &PgPool, role_id: i32) -> Result<()> {
    repository::delete_role(pool, role_id).await
}

pub async fn update_role_page_permission(
    pool: &PgPool,
    input: &UpdateRolePagePermissionInput,
) -> Result<RolePagePermission> {
    repository::update_role_page_permission(pool, input).await
}
