use std::env;

use anyhow::{Result, bail};
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
const MIN_ADMIN_SEED_PASSWORD_LENGTH: usize = 16;

pub async fn ensure_seed_admin(pool: &PgPool) -> Result<()> {
    if repository::count_admin_users(pool).await? > 0 {
        return Ok(());
    }

    let password = validated_seed_password(env::var("ADMIN_SEED_PASSWORD").ok())?;

    let role = repository::fetch_super_admin_role(pool).await?;
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

fn validated_seed_password(configured_password: Option<String>) -> Result<String> {
    let Some(password) = configured_password else {
        bail!("ADMIN_SEED_PASSWORD must be set before initializing the first admin user");
    };

    if password.len() < MIN_ADMIN_SEED_PASSWORD_LENGTH {
        bail!(
            "ADMIN_SEED_PASSWORD must be at least {MIN_ADMIN_SEED_PASSWORD_LENGTH} characters long"
        );
    }

    Ok(password)
}

const LOGIN_WINDOW_MINUTES: i32 = 15;
const MAX_FAILED_LOGINS_PER_USERNAME: i64 = 5;
const MAX_LOGINS_PER_CLIENT: i64 = 20;
/// Throttle rows older than this are never counted again — prune them
/// opportunistically so the ledger cannot grow without bound. Kept far above
/// the 15-minute throttle window so pruning never weakens the throttle.
const LOGIN_ATTEMPT_RETENTION_HOURS: i32 = 24;
const INVALID_LOGIN_MESSAGE: &str = "Invalid username or password.";
const LOGIN_THROTTLED_MESSAGE: &str = "Too many login attempts. Try again in a few minutes.";

/// Postgres SQLSTATE for "relation does not exist" — the throttle table
/// (`admin_login_attempts`, migration 0036) is not applied yet.
const POSTGRES_UNDEFINED_TABLE: &str = "42P01";

/// True only when a throttle lookup failed because the throttle table does
/// not exist. Every other database error must still fail closed.
fn is_missing_throttle_table(error: &anyhow::Error) -> bool {
    let Some(sqlx_error) = error.downcast_ref::<sqlx::Error>() else {
        return false;
    };
    match sqlx_error {
        sqlx::Error::Database(db_error) => {
            db_error.code().as_deref() == Some(POSTGRES_UNDEFINED_TABLE)
        }
        _ => false,
    }
}

pub fn client_key_from_headers(headers: &HeaderMap) -> String {
    forwarded_client_key(headers).unwrap_or_else(|| "unknown".to_string())
}

fn forwarded_client_key(headers: &HeaderMap) -> Option<String> {
    let forwarded = headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok());
    let real_ip = headers
        .get("x-real-ip")
        .and_then(|value| value.to_str().ok());
    select_client_key(forwarded, real_ip, trusted_proxy_hops())
}

/// Trusted reverse-proxy hops between the internet and this backend.
/// Production edge is a single Caddy `reverse_proxy`, which appends the
/// caller IP to any inbound `X-Forwarded-For` — so the default of 1 takes
/// the *last* chain element. A client-supplied first element must never be
/// trusted: it buys a fresh throttle bucket per request. Raise only when
/// another trusted proxy hop is verifiably added in front; each extra hop
/// widens the shared bucket.
fn trusted_proxy_hops() -> usize {
    env::var("TRUSTED_PROXY_HOPS")
        .ok()
        .and_then(|value| value.trim().parse::<usize>().ok())
        .filter(|&hops| hops > 0)
        .unwrap_or(1)
}

fn select_client_key(
    forwarded_for: Option<&str>,
    real_ip: Option<&str>,
    trusted_hops: usize,
) -> Option<String> {
    let chain = forwarded_for
        .unwrap_or("")
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if chain.is_empty() {
        return real_ip
            .map(str::trim)
            .filter(|ip| !ip.is_empty())
            .map(str::to_string);
    }
    let index = chain.len().saturating_sub(trusted_hops.max(1));
    chain.get(index).map(|key| (*key).to_string())
}

pub async fn login(
    pool: &PgPool,
    input: &AdminLoginInput,
    client_key: &str,
) -> Result<AdminAuthPayload, HttpError> {
    let username = input.username.trim();
    let password = input.password.as_str();
    let username_key = username.to_lowercase();
    let client_key = if client_key.trim().is_empty() {
        "unknown"
    } else {
        client_key.trim()
    };

    if username.is_empty() || password.is_empty() {
        return Err((StatusCode::UNAUTHORIZED, INVALID_LOGIN_MESSAGE.to_string()));
    }

    // A missing throttle table (migration 0036 not applied) must degrade
    // availability of the throttle — never availability of login itself.
    // Any other database error still fails closed via map_auth_lookup_error.
    let throttled = match login_is_throttled(pool, &username_key, client_key).await {
        Ok(throttled) => throttled,
        Err(error) if is_missing_throttle_table(&error) => {
            tracing::warn!(
                "admin login throttle unavailable (admin_login_attempts missing, apply migration 0036); allowing login attempt"
            );
            false
        }
        Err(error) => return Err(map_auth_lookup_error(error)),
    };
    if throttled {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            LOGIN_THROTTLED_MESSAGE.to_string(),
        ));
    }

    let Some(admin_user) = repository::fetch_admin_user_by_username(pool, username)
        .await
        .map_err(map_auth_lookup_error)?
    else {
        record_login_attempt(pool, &username_key, client_key, false).await;
        return Err((StatusCode::UNAUTHORIZED, INVALID_LOGIN_MESSAGE.to_string()));
    };

    if !admin_user.is_active {
        record_login_attempt(pool, &username_key, client_key, false).await;
        return Err((StatusCode::UNAUTHORIZED, INVALID_LOGIN_MESSAGE.to_string()));
    }

    if !verify_password(password, &admin_user.password_hash) {
        record_login_attempt(pool, &username_key, client_key, false).await;
        return Err((StatusCode::UNAUTHORIZED, INVALID_LOGIN_MESSAGE.to_string()));
    }

    if let Err(error) = repository::delete_expired_admin_sessions(pool).await {
        tracing::warn!("failed to purge expired admin sessions: {error:?}");
    }

    let token = generate_session_token();
    repository::insert_admin_session(pool, admin_user.id, &token)
        .await
        .map_err(map_auth_lookup_error)?;
    record_login_attempt(pool, &username_key, client_key, true).await;

    let username = admin_user.username.clone();
    let payload = build_auth_payload(pool, admin_user, token).await?;

    audit::service::record_event(pool, &username, "login", "admin_user", &username, "").await;

    Ok(payload)
}

async fn login_is_throttled(pool: &PgPool, username_key: &str, client_key: &str) -> Result<bool> {
    let failed =
        repository::count_recent_failed_admin_logins(pool, username_key, LOGIN_WINDOW_MINUTES)
            .await?;
    let from_client =
        repository::count_recent_admin_logins_for_client(pool, client_key, LOGIN_WINDOW_MINUTES)
            .await?;
    Ok(failed >= MAX_FAILED_LOGINS_PER_USERNAME || from_client >= MAX_LOGINS_PER_CLIENT)
}

async fn record_login_attempt(
    pool: &PgPool,
    username_key: &str,
    client_key: &str,
    succeeded: bool,
) {
    if let Err(error) =
        repository::record_admin_login_attempt(pool, username_key, client_key, succeeded).await
    {
        tracing::warn!("failed to record admin login attempt: {error:?}");
        return;
    }
    match repository::prune_old_admin_login_attempts(pool, LOGIN_ATTEMPT_RETENTION_HOURS).await {
        Ok(pruned) if pruned > 0 => {
            tracing::debug!("pruned {pruned} old admin login attempts");
        }
        Ok(_) => {}
        Err(error) => {
            tracing::warn!("failed to prune old admin login attempts: {error:?}");
        }
    }
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

#[cfg(test)]
mod tests {
    use std::borrow::Cow;

    use sqlx::error::{DatabaseError, ErrorKind};

    use super::{is_missing_throttle_table, select_client_key, validated_seed_password};

    #[test]
    fn seed_password_is_required_and_minimum_length() {
        assert!(validated_seed_password(None).is_err());
        assert!(validated_seed_password(Some("short".to_string())).is_err());
        assert_eq!(
            validated_seed_password(Some("0123456789abcdef".to_string()))
                .expect("a 16-character seed password should be accepted"),
            "0123456789abcdef"
        );
    }

    #[derive(Debug)]
    struct FakeDbError {
        code: Option<&'static str>,
        message: &'static str,
    }

    impl std::fmt::Display for FakeDbError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl std::error::Error for FakeDbError {}

    impl DatabaseError for FakeDbError {
        fn message(&self) -> &str {
            self.message
        }

        fn code(&self) -> Option<Cow<'_, str>> {
            self.code.map(Cow::Borrowed)
        }

        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }

        fn kind(&self) -> ErrorKind {
            ErrorKind::Other
        }
    }

    fn db_error_as_anyhow(code: Option<&'static str>) -> anyhow::Error {
        sqlx::Error::Database(Box::new(FakeDbError {
            code,
            message: "fake database error",
        }))
        .into()
    }

    #[test]
    fn client_key_takes_the_trusted_tail_of_forwarded_for() {
        // Single proxy (Caddy): last element is the real caller.
        assert_eq!(
            select_client_key(Some("203.0.113.7"), None, 1).as_deref(),
            Some("203.0.113.7")
        );
        // Spoofed first element must not win.
        assert_eq!(
            select_client_key(Some("203.0.113.9, 198.51.100.4"), None, 1).as_deref(),
            Some("198.51.100.4")
        );
        assert_eq!(
            select_client_key(Some("203.0.113.9, 198.51.100.4"), None, 2).as_deref(),
            Some("203.0.113.9")
        );
        // Whitespace and empty segments are ignored.
        assert_eq!(
            select_client_key(Some(" 203.0.113.9 ,, 198.51.100.4 "), None, 1).as_deref(),
            Some("198.51.100.4")
        );
        // More hops than elements saturates at the first element.
        assert_eq!(
            select_client_key(Some("203.0.113.9"), None, 5).as_deref(),
            Some("203.0.113.9")
        );
        // Zero hops is meaningless: treated as one.
        assert_eq!(
            select_client_key(Some("203.0.113.9, 198.51.100.4"), None, 0).as_deref(),
            Some("198.51.100.4")
        );
        // No chain: fall back to X-Real-IP, then to nothing.
        assert_eq!(
            select_client_key(None, Some("198.51.100.4"), 1).as_deref(),
            Some("198.51.100.4")
        );
        assert_eq!(select_client_key(None, None, 1), None);
        assert_eq!(select_client_key(Some(""), Some(""), 1), None);
    }

    #[test]
    fn missing_throttle_table_detects_only_undefined_table() {
        assert!(is_missing_throttle_table(&db_error_as_anyhow(Some(
            "42P01"
        ))));
        assert!(!is_missing_throttle_table(&db_error_as_anyhow(Some(
            "23505"
        ))));
        assert!(!is_missing_throttle_table(&db_error_as_anyhow(None)));
        let row_not_found: anyhow::Error = sqlx::Error::RowNotFound.into();
        assert!(!is_missing_throttle_table(&row_not_found));
        let plain = anyhow::anyhow!("boom");
        assert!(!is_missing_throttle_table(&plain));
    }
}
