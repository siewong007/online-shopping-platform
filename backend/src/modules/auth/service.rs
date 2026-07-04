use std::env;

use anyhow::Result;
use axum::{
    extract::FromRequestParts,
    http::{HeaderMap, StatusCode, request::Parts},
};
use sqlx::PgPool;

use crate::{
    app_state::AppState,
    error::HttpError,
    modules::audit,
    security::{generate_session_token, hash_password, verify_password},
};

use super::{
    dto::{AdminAuthPayload, AdminLoginInput, AdminMePayload},
    model::{AdminIdentity, AdminUser, AdminUserCredentials},
    repository,
};

const DEFAULT_ADMIN_USERNAME: &str = "admin";
const DEFAULT_ADMIN_DISPLAY_NAME: &str = "Admin";
const DEFAULT_ADMIN_PASSWORD: &str = "admin123";

pub async fn ensure_seed_admin(pool: &PgPool) -> Result<()> {
    if repository::count_admin_users(pool).await? > 0 {
        return Ok(());
    }

    let role = repository::fetch_super_admin_role(pool).await?;
    let password =
        env::var("ADMIN_SEED_PASSWORD").unwrap_or_else(|_| DEFAULT_ADMIN_PASSWORD.to_string());
    let password_hash = hash_password(&password)?;

    repository::create_admin_user(
        pool,
        DEFAULT_ADMIN_USERNAME,
        DEFAULT_ADMIN_DISPLAY_NAME,
        &password_hash,
        role.id,
    )
    .await?;

    Ok(())
}

pub async fn login(pool: &PgPool, input: &AdminLoginInput) -> Result<AdminAuthPayload, HttpError> {
    let username = input.username.trim();
    let password = input.password.as_str();

    if username.is_empty() || password.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid username or password.".to_string(),
        ));
    }

    let Some(admin_user) = repository::fetch_admin_user_by_username(pool, username)
        .await
        .map_err(map_auth_lookup_error)?
    else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid username or password.".to_string(),
        ));
    };

    if !admin_user.is_active {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid username or password.".to_string(),
        ));
    }

    if !verify_password(password, &admin_user.password_hash) {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid username or password.".to_string(),
        ));
    }

    if let Err(error) = repository::delete_expired_admin_sessions(pool).await {
        tracing::warn!("failed to purge expired admin sessions: {error:?}");
    }

    let token = generate_session_token();
    repository::insert_admin_session(pool, admin_user.id, &token)
        .await
        .map_err(map_auth_lookup_error)?;

    let username = admin_user.username.clone();
    let payload = build_auth_payload(pool, admin_user, token).await?;

    audit::service::record_event(pool, &username, "login", "admin_user", &username, "").await;

    Ok(payload)
}

pub async fn logout(
    pool: &PgPool,
    identity: &AdminIdentity,
    headers: &HeaderMap,
) -> Result<(), HttpError> {
    let token = bearer_token_from_headers(headers)?;

    repository::delete_admin_session(pool, token)
        .await
        .map_err(map_auth_lookup_error)?;

    audit::service::record_event(
        pool,
        &identity.username,
        "logout",
        "admin_user",
        &identity.username,
        "",
    )
    .await;

    Ok(())
}

pub async fn me(pool: &PgPool, identity: &AdminIdentity) -> Result<AdminMePayload, HttpError> {
    let Some(admin_user) = repository::fetch_admin_user_by_username(pool, &identity.username)
        .await
        .map_err(map_auth_lookup_error)?
    else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Admin session is no longer valid.".to_string(),
        ));
    };

    let user = public_admin_user(&admin_user);
    let role = repository::fetch_role(pool, admin_user.role_id)
        .await
        .map_err(map_auth_lookup_error)?;
    let permissions = repository::fetch_role_page_permissions(pool, admin_user.role_id)
        .await
        .map_err(map_auth_lookup_error)?;

    Ok(AdminMePayload {
        user,
        role,
        permissions,
    })
}

pub async fn authenticate_token(pool: &PgPool, token: &str) -> Result<AdminIdentity, HttpError> {
    repository::authenticate_admin_session(pool, token)
        .await
        .map_err(map_auth_lookup_error)?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Admin session is missing or expired.".to_string(),
            )
        })
}

pub fn bearer_token_from_headers(headers: &HeaderMap) -> Result<&str, HttpError> {
    let header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Admin authorization is required.".to_string(),
            )
        })?;

    header.strip_prefix("Bearer ").ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            "Admin authorization must use a Bearer token.".to_string(),
        )
    })
}

impl FromRequestParts<AppState> for AdminIdentity {
    type Rejection = HttpError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer_token_from_headers(&parts.headers)?;
        authenticate_token(&state.pool, token).await
    }
}

fn public_admin_user(admin_user: &AdminUserCredentials) -> AdminUser {
    AdminUser {
        id: admin_user.id,
        username: admin_user.username.clone(),
        display_name: admin_user.display_name.clone(),
        role_id: admin_user.role_id,
        is_active: admin_user.is_active,
        created_at: admin_user.created_at.clone(),
        updated_at: admin_user.updated_at.clone(),
    }
}

async fn build_auth_payload(
    pool: &PgPool,
    admin_user: AdminUserCredentials,
    token: String,
) -> Result<AdminAuthPayload, HttpError> {
    let user = public_admin_user(&admin_user);
    let role = repository::fetch_role(pool, admin_user.role_id)
        .await
        .map_err(map_auth_lookup_error)?;
    let permissions = repository::fetch_role_page_permissions(pool, admin_user.role_id)
        .await
        .map_err(map_auth_lookup_error)?;

    Ok(AdminAuthPayload {
        token,
        user,
        role,
        permissions,
    })
}

fn map_auth_lookup_error(error: anyhow::Error) -> HttpError {
    tracing::error!("admin auth lookup failed: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to verify admin credentials.".to_string(),
    )
}
