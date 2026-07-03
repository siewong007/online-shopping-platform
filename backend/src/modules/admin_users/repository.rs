use anyhow::Result;
use sqlx::PgPool;

use crate::models::{AdminUser, AdminUserCredentials};

pub async fn fetch_admin_users(pool: &PgPool) -> Result<Vec<AdminUser>> {
    crate::db::fetch_admin_users(pool).await
}

pub async fn fetch_admin_user_by_id(
    pool: &PgPool,
    admin_user_id: i32,
) -> Result<Option<AdminUserCredentials>> {
    crate::db::fetch_admin_user_by_id(pool, admin_user_id).await
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

pub async fn update_admin_user_profile(
    pool: &PgPool,
    admin_user_id: i32,
    display_name: &str,
    role_id: i32,
) -> Result<AdminUser> {
    crate::db::update_admin_user_profile(pool, admin_user_id, display_name, role_id).await
}

pub async fn set_admin_user_active(
    pool: &PgPool,
    admin_user_id: i32,
    is_active: bool,
) -> Result<AdminUser> {
    crate::db::set_admin_user_active(pool, admin_user_id, is_active).await
}

pub async fn update_admin_user_password(
    pool: &PgPool,
    admin_user_id: i32,
    password_hash: &str,
) -> Result<()> {
    crate::db::update_admin_user_password(pool, admin_user_id, password_hash).await
}

pub async fn delete_admin_sessions_for_user(pool: &PgPool, admin_user_id: i32) -> Result<()> {
    crate::db::delete_admin_sessions_for_user(pool, admin_user_id).await
}
