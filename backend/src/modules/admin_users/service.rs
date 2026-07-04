use anyhow::Result;
use axum::http::StatusCode;
use sqlx::PgPool;

use crate::{
    error::{self, HttpError},
    modules::{audit, auth::model::AdminIdentity},
    security::{hash_password, verify_password},
};

use super::{
    dto::{
        AdminResetPasswordInput, ChangeOwnPasswordInput, CreateAdminUserInput,
        SetAdminUserActiveInput, UpdateAdminUserProfileInput,
    },
    model::{ADMIN_PERMISSIONS_PAGE, AdminUser, PermissionAction},
    repository,
};

pub async fn list_users(
    pool: &PgPool,
    identity: &AdminIdentity,
) -> Result<Vec<AdminUser>, HttpError> {
    ensure_permission(pool, identity, PermissionAction::Read).await?;

    repository::fetch_admin_users(pool)
        .await
        .map_err(|error| error::map_admin_query_error("admin users query failed", error))
}

pub async fn create_user(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreateAdminUserInput,
) -> Result<AdminUser, HttpError> {
    ensure_permission(pool, identity, PermissionAction::Create).await?;

    let password_hash = hash_password(&input.password).map_err(error::map_admin_error)?;

    let user = repository::create_admin_user(
        pool,
        &input.username,
        &input.display_name,
        &password_hash,
        input.role_id,
    )
    .await
    .map_err(error::map_admin_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "admin_user",
        &user.id.to_string(),
        &user.username,
    )
    .await;

    Ok(user)
}

pub async fn update_profile(
    pool: &PgPool,
    identity: &AdminIdentity,
    target_id: i32,
    input: &UpdateAdminUserProfileInput,
) -> Result<AdminUser, HttpError> {
    ensure_permission(pool, identity, PermissionAction::Update).await?;

    let user =
        repository::update_admin_user_profile(pool, target_id, &input.display_name, input.role_id)
            .await
            .map_err(error::map_admin_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "admin_user",
        &user.id.to_string(),
        &user.username,
    )
    .await;

    Ok(user)
}

pub async fn set_active(
    pool: &PgPool,
    identity: &AdminIdentity,
    target_id: i32,
    input: &SetAdminUserActiveInput,
) -> Result<AdminUser, HttpError> {
    ensure_permission(pool, identity, PermissionAction::Update).await?;

    let user = repository::set_admin_user_active(pool, target_id, input.is_active)
        .await
        .map_err(error::map_admin_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        if input.is_active {
            "activate"
        } else {
            "deactivate"
        },
        "admin_user",
        &user.id.to_string(),
        &user.username,
    )
    .await;

    Ok(user)
}

pub async fn admin_reset_password(
    pool: &PgPool,
    identity: &AdminIdentity,
    target_id: i32,
    input: &AdminResetPasswordInput,
) -> Result<(), HttpError> {
    ensure_permission(pool, identity, PermissionAction::Update).await?;

    let password_hash = hash_password(&input.new_password).map_err(error::map_admin_error)?;

    repository::update_admin_user_password(pool, target_id, &password_hash)
        .await
        .map_err(error::map_admin_error)?;

    repository::delete_admin_sessions_for_user(pool, target_id)
        .await
        .map_err(error::map_admin_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        "reset_password",
        "admin_user",
        &target_id.to_string(),
        "",
    )
    .await;

    Ok(())
}

pub async fn change_own_password(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &ChangeOwnPasswordInput,
) -> Result<(), HttpError> {
    let credentials = repository::fetch_admin_user_by_id(pool, identity.user_id)
        .await
        .map_err(|error| error::map_admin_query_error("admin user lookup failed", error))?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Admin session is no longer valid.".to_string(),
            )
        })?;

    if !verify_password(&input.current_password, &credentials.password_hash) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Current password is incorrect.".to_string(),
        ));
    }

    let password_hash = hash_password(&input.new_password).map_err(error::map_admin_error)?;

    repository::update_admin_user_password(pool, identity.user_id, &password_hash)
        .await
        .map_err(error::map_admin_error)?;

    repository::delete_admin_sessions_for_user(pool, identity.user_id)
        .await
        .map_err(error::map_admin_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        "change_own_password",
        "admin_user",
        &identity.user_id.to_string(),
        "",
    )
    .await;

    Ok(())
}

async fn ensure_permission(
    pool: &PgPool,
    identity: &AdminIdentity,
    action: PermissionAction,
) -> Result<(), HttpError> {
    crate::modules::permissions::service::ensure_permission(
        pool,
        identity,
        ADMIN_PERMISSIONS_PAGE,
        action,
        "admin user",
    )
    .await
}
