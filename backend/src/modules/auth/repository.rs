use anyhow::Result;
use sqlx::PgPool;

use super::model::{AdminIdentity, AdminUser, AdminUserCredentials, Role, RolePagePermission};

pub async fn count_admin_users(pool: &PgPool) -> Result<i64> {
    crate::db::count_admin_users(pool).await
}

pub async fn create_admin_user(
    pool: &PgPool,
    username: &str,
    display_name: &str,
    password_hash: &str,
    role_id: i32,
) -> Result<AdminUser> {
    crate::db::create_admin_user(pool, username, display_name, password_hash, role_id).await
}

pub async fn fetch_admin_user_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<AdminUserCredentials>> {
    crate::db::fetch_admin_user_by_username(pool, username).await
}

pub async fn fetch_role(pool: &PgPool, role_id: i32) -> Result<Role> {
    crate::db::fetch_role(pool, role_id).await
}

pub async fn fetch_super_admin_role(pool: &PgPool) -> Result<Role> {
    crate::db::fetch_super_admin_role(pool).await
}

pub async fn fetch_role_page_permissions(
    pool: &PgPool,
    role_id: i32,
) -> Result<Vec<RolePagePermission>> {
    crate::db::fetch_role_page_permissions(pool, role_id).await
}

pub async fn insert_admin_session(pool: &PgPool, admin_user_id: i32, token: &str) -> Result<()> {
    crate::db::insert_admin_session(pool, admin_user_id, token).await
}

pub async fn delete_admin_session(pool: &PgPool, token: &str) -> Result<()> {
    crate::db::delete_admin_session(pool, token).await
}

pub async fn authenticate_admin_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<AdminIdentity>> {
    crate::db::authenticate_admin_session(pool, token).await
}

pub async fn delete_expired_admin_sessions(pool: &PgPool) -> Result<()> {
    crate::db::delete_expired_admin_sessions(pool).await
}
