use anyhow::Result;
use axum::{
    extract::{FromRequestParts, OptionalFromRequestParts},
    http::{HeaderMap, StatusCode, request::Parts},
};
use sqlx::PgPool;

use crate::{
    app_state::AppState,
    error::HttpError,
    security::{generate_session_token, hash_password, verify_password_or_dummy},
};

use super::{
    dto::{
        CustomerAuthPayload, CustomerLoginInput, CustomerMePayload, CustomerRegisterInput,
        CustomerSessionView,
    },
    model::{CustomerAccount, CustomerIdentity},
    repository,
};

const MIN_PASSWORD_LENGTH: usize = 8;
const INVALID_CREDENTIALS: &str = "Invalid email or password.";

/// Matches both the pre-check in `db::create_customer_account` (bails with this exact
/// message) and the unique-index violation that check races against, so a concurrent
/// duplicate registration still gets classified as a 400 rather than a 500.
fn is_duplicate_email_error(error: &anyhow::Error) -> bool {
    if error.to_string() == "Unable to register." {
        return true;
    }

    error
        .downcast_ref::<sqlx::Error>()
        .and_then(|error| error.as_database_error())
        .is_some_and(|error| error.is_unique_violation())
}

fn is_valid_email(email: &str) -> bool {
    match email.split_once('@') {
        Some((local, domain)) => {
            !local.is_empty()
                && domain.contains('.')
                && !domain.starts_with('.')
                && !domain.ends_with('.')
        }
        None => false,
    }
}

pub async fn register(
    pool: &PgPool,
    input: &CustomerRegisterInput,
    user_agent: Option<&str>,
) -> Result<CustomerAuthPayload, HttpError> {
    let email = input.email.trim();
    let display_name = input.display_name.trim();

    if !is_valid_email(email) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Enter a valid email address.".to_string(),
        ));
    }

    if display_name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Display name is required.".to_string(),
        ));
    }

    if input.password.len() < MIN_PASSWORD_LENGTH {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Password must be at least {MIN_PASSWORD_LENGTH} characters."),
        ));
    }

    let password_hash = hash_password(&input.password).map_err(map_customer_error)?;

    let account = repository::create_customer_account(pool, email, &password_hash, display_name)
        .await
        .map_err(|error| {
            if is_duplicate_email_error(&error) {
                (StatusCode::BAD_REQUEST, "Unable to register.".to_string())
            } else {
                map_customer_error(error)
            }
        })?;

    repository::link_portal_profile_to_account(pool, account.id, &account.email)
        .await
        .map_err(map_customer_error)?;

    let token = generate_session_token();
    repository::insert_customer_session(pool, account.id, &token, user_agent)
        .await
        .map_err(map_customer_error)?;

    Ok(CustomerAuthPayload { token, account })
}

pub async fn login(
    pool: &PgPool,
    input: &CustomerLoginInput,
    user_agent: Option<&str>,
) -> Result<CustomerAuthPayload, HttpError> {
    let email = input.email.trim();

    let credentials = repository::fetch_customer_account_by_email(pool, email)
        .await
        .map_err(map_customer_error)?;

    let password_hash = credentials
        .as_ref()
        .map(|creds| creds.password_hash.as_str());
    if !verify_password_or_dummy(&input.password, password_hash) {
        return Err((StatusCode::UNAUTHORIZED, INVALID_CREDENTIALS.to_string()));
    }

    let Some(credentials) = credentials else {
        return Err((StatusCode::UNAUTHORIZED, INVALID_CREDENTIALS.to_string()));
    };

    repository::link_portal_profile_to_account(pool, credentials.id, &credentials.email)
        .await
        .map_err(map_customer_error)?;

    let token = generate_session_token();
    repository::insert_customer_session(pool, credentials.id, &token, user_agent)
        .await
        .map_err(map_customer_error)?;

    Ok(CustomerAuthPayload {
        token,
        account: CustomerAccount {
            id: credentials.id,
            email: credentials.email,
            display_name: credentials.display_name,
            created_at: credentials.created_at,
            updated_at: credentials.updated_at,
        },
    })
}

pub async fn logout(pool: &PgPool, headers: &HeaderMap) -> Result<(), HttpError> {
    let token = bearer_token_from_headers(headers)?;

    repository::delete_customer_session(pool, token)
        .await
        .map_err(map_customer_error)
}

pub async fn me(
    pool: &PgPool,
    identity: &CustomerIdentity,
) -> Result<CustomerMePayload, HttpError> {
    repository::fetch_customer_me(pool, identity.customer_account_id)
        .await
        .map_err(map_customer_error)
}

pub async fn sessions(
    pool: &PgPool,
    identity: &CustomerIdentity,
) -> Result<Vec<CustomerSessionView>, HttpError> {
    repository::fetch_customer_sessions(pool, identity.customer_account_id)
        .await
        .map_err(map_customer_error)
        .map(|sessions| {
            sessions
                .into_iter()
                .map(|session| CustomerSessionView {
                    id: session.id,
                    user_agent: session.user_agent,
                    created_at: session.created_at,
                    last_seen_at: session.last_seen_at,
                    expires_at: session.expires_at,
                    is_current: session.id == identity.session_id,
                })
                .collect()
        })
}

pub async fn logout_session(
    pool: &PgPool,
    identity: &CustomerIdentity,
    session_id: i32,
) -> Result<(), HttpError> {
    if session_id == identity.session_id {
        return Err((
            StatusCode::BAD_REQUEST,
            "Use logout to end this device's session.".to_string(),
        ));
    }

    let deleted = repository::delete_customer_session_for_account(
        pool,
        identity.customer_account_id,
        session_id,
    )
    .await
    .map_err(map_customer_error)?;

    if deleted {
        Ok(())
    } else {
        Err((StatusCode::NOT_FOUND, "Session not found.".to_string()))
    }
}

pub async fn logout_other_sessions(
    pool: &PgPool,
    identity: &CustomerIdentity,
) -> Result<(), HttpError> {
    repository::delete_other_customer_sessions(
        pool,
        identity.customer_account_id,
        identity.session_id,
    )
    .await
    .map_err(map_customer_error)
}

pub async fn authenticate_token(pool: &PgPool, token: &str) -> Result<CustomerIdentity, HttpError> {
    let identity = repository::authenticate_customer_session(pool, token)
        .await
        .map_err(map_customer_error)?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Customer session is missing or expired.".to_string(),
            )
        })?;

    repository::touch_customer_session(pool, identity.session_id)
        .await
        .map_err(map_customer_error)?;

    Ok(identity)
}

fn bearer_token_from_headers(headers: &HeaderMap) -> Result<&str, HttpError> {
    let header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Customer authorization is required.".to_string(),
            )
        })?;

    header.strip_prefix("Bearer ").ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            "Customer authorization must use a Bearer token.".to_string(),
        )
    })
}

impl FromRequestParts<AppState> for CustomerIdentity {
    type Rejection = HttpError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer_token_from_headers(&parts.headers)?;
        authenticate_token(&state.pool, token).await
    }
}

impl OptionalFromRequestParts<AppState> for CustomerIdentity {
    type Rejection = HttpError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Option<Self>, Self::Rejection> {
        let Ok(token) = bearer_token_from_headers(&parts.headers) else {
            return Ok(None);
        };

        match authenticate_token(&state.pool, token).await {
            Ok(identity) => Ok(Some(identity)),
            Err(_) => Ok(None),
        }
    }
}

fn map_customer_error(error: anyhow::Error) -> HttpError {
    tracing::error!("customer auth failed: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to process this request.".to_string(),
    )
}
