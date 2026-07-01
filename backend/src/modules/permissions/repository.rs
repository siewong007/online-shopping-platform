use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateRoleInput, PermissionsPayload, UpdateRoleInput, UpdateRolePagePermissionInput},
    model::{PermissionAction, Role, RolePagePermission},
};

pub async fn fetch_permissions(pool: &PgPool) -> Result<PermissionsPayload> {
    crate::db::fetch_permissions(pool).await
}

pub async fn role_has_page_permission(
    pool: &PgPool,
    role_id: i32,
    page_slug: &str,
    action: PermissionAction,
) -> Result<bool> {
    crate::db::role_has_page_permission(pool, role_id, page_slug, action).await
}

pub async fn create_role(pool: &PgPool, input: &CreateRoleInput) -> Result<Role> {
    crate::db::create_role(pool, input).await
}

pub async fn update_role(pool: &PgPool, role_id: i32, input: &UpdateRoleInput) -> Result<Role> {
    crate::db::update_role(pool, role_id, input).await
}

pub async fn delete_role(pool: &PgPool, role_id: i32) -> Result<()> {
    crate::db::delete_role(pool, role_id).await
}

pub async fn update_role_page_permission(
    pool: &PgPool,
    input: &UpdateRolePagePermissionInput,
) -> Result<RolePagePermission> {
    crate::db::update_role_page_permission(pool, input).await
}
