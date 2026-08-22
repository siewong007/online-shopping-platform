use anyhow::{Result, bail};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use chacha20poly1305::{
    XChaCha20Poly1305,
    aead::{Aead, KeyInit, Payload},
};
use rand::{RngCore, rngs::OsRng};
use sqlx::PgPool;

use crate::{
    db,
    error::HttpError,
    models::{AdminAuthPayload, AdminIdentity},
    modules::mfa::dto,
    security,
};

const CHALLENGE_TOKEN_BYTES: usize = 32;
const LOGIN_CHALLENGE_SECONDS: i64 = 300;
const ENROLLMENT_CHALLENGE_SECONDS: i64 = 900;
const RECOVERY_CODE_COUNT: usize = 10;
const TOTP_STEP_SECONDS: u64 = 30;
const TOTP_ALLOWED_STEP_DRIFT: u64 = 1;
const SECRET_BYTES: usize = 20;

/// Master key for encrypting TOTP secrets at rest. Fail-closed: without it enrollment is
/// unavailable and an already-enrolled admin cannot complete login — the operator restores the
/// key; the factor is never bypassed.
#[derive(Clone)]
pub struct MfaConfig {
    key: Option<[u8; 32]>,
}

impl MfaConfig {
    pub fn from_environment() -> Result<Self> {
        let raw = std::env::var("MFA_ENCRYPTION_KEY")
            .unwrap_or_default()
            .trim()
            .to_string();
        if raw.is_empty() {
            return Ok(Self { key: None });
        }
        // Hex is tried first because many hex strings are also valid (wrong-length) base64.
        // A standard-base64 key that contains characters outside the hex alphabet still takes
        // the base64 path; a key made purely of hex characters is read as hex by definition.
        let decoded = decode_hex_str(&raw)
            .or_else(|_| {
                BASE64
                    .decode(&raw)
                    .map_err(|_| anyhow::anyhow!("not base64 either"))
            })
            .map_err(|_| anyhow::anyhow!("MFA_ENCRYPTION_KEY must be base64 or hex"))?;
        let key: [u8; 32] = decoded
            .try_into()
            .map_err(|_| anyhow::anyhow!("MFA_ENCRYPTION_KEY must decode to exactly 32 bytes"))?;
        Ok(Self { key: Some(key) })
    }

    pub fn disabled() -> Self {
        Self { key: None }
    }

    /// Explicit-key constructor used by deployments that inject configuration programmatically
    /// and by the integration suite's fixed test key.
    pub fn from_raw_key(key: [u8; 32]) -> Self {
        Self { key: Some(key) }
    }

    fn encryption_key(&self) -> Result<&[u8; 32]> {
        self.key.as_ref().ok_or_else(|| {
            anyhow::anyhow!(
                "MFA is enrolled but MFA_ENCRYPTION_KEY is not configured; refusing to weaken authentication"
            )
        })
    }

    pub fn is_enabled(&self) -> bool {
        self.key.is_some()
    }
}

fn decode_hex_str(raw: &str) -> Result<Vec<u8>> {
    if !raw.len().is_multiple_of(2) || !raw.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        bail!("not hex");
    }
    (0..raw.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&raw[index..index + 2], 16).map_err(|_| anyhow::anyhow!("not hex"))
        })
        .collect()
}

fn encrypt_secret(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|_| anyhow::anyhow!("MFA encryption key has the wrong length"))?;
    let mut nonce_bytes = [0_u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher
        .encrypt(
            (&nonce_bytes).into(),
            Payload {
                msg: plaintext,
                aad: &[],
            },
        )
        .map_err(|_| anyhow::anyhow!("MFA secret encryption failed"))?;
    Ok((ciphertext, nonce_bytes.to_vec()))
}

fn decrypt_secret(key: &[u8; 32], ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|_| anyhow::anyhow!("MFA encryption key has the wrong length"))?;
    let nonce: [u8; 24] = nonce
        .try_into()
        .map_err(|_| anyhow::anyhow!("stored MFA nonce is malformed"))?;
    cipher
        .decrypt(
            (&nonce).into(),
            Payload {
                msg: ciphertext,
                aad: &[],
            },
        )
        .map_err(|_| anyhow::anyhow!("stored MFA secret could not be decrypted with this key"))
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        use std::fmt::Write as _;
        let _ = write!(out, "{byte:02x}");
    }
    out
}

fn random_token() -> String {
    let mut bytes = vec![0_u8; CHALLENGE_TOKEN_BYTES];
    OsRng.fill_bytes(&mut bytes);
    hex_encode(&bytes)
}

fn token_hash(token: &str) -> String {
    security::sha256_hex(token.as_bytes())
}

/// Unambiguous alphabet (no 0/O/1/I/L), grouped xxxxx-xxxxx.
const RECOVERY_ALPHABET: &[u8] = b"23456789ABCDEFGHJKMNPQRSTUVWXYZ";

fn generate_recovery_code() -> String {
    const ALPHABET: &[u8] = RECOVERY_ALPHABET;
    let mut chars = [0_u8; 10];
    OsRng.fill_bytes(&mut chars);
    chars
        .iter_mut()
        .for_each(|byte| *byte = ALPHABET[(*byte as usize) % ALPHABET.len()]);
    format!(
        "{}-{}",
        std::str::from_utf8(&chars[..5]).expect("alphabet is ascii"),
        std::str::from_utf8(&chars[5..]).expect("alphabet is ascii"),
    )
}

fn build_totp(
    secret: &[u8],
    issuer: Option<String>,
    account_name: String,
) -> Result<totp_rs::TOTP> {
    totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1,
        6,
        TOTP_ALLOWED_STEP_DRIFT as u8,
        TOTP_STEP_SECONDS,
        secret.to_vec(),
        issuer,
        account_name,
    )
    .map_err(|error| anyhow::anyhow!("TOTP parameters are invalid: {error}"))
}

/// Verifies `code` against the current and adjacent time steps, returning the matched step index
/// so replays of one code can be rejected via `last_accepted_step`.
fn verify_totp_code(totp: &totp_rs::TOTP, code: &str) -> Option<i64> {
    let now_step = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs()
        / TOTP_STEP_SECONDS;
    let normalized = code.trim().replace(' ', "");
    (0..=TOTP_ALLOWED_STEP_DRIFT * 2)
        .map(|offset| (now_step + offset).saturating_sub(TOTP_ALLOWED_STEP_DRIFT))
        .find(|step| normalized == totp.generate(step * TOTP_STEP_SECONDS))
        .map(|step| step as i64)
}

fn map_mfa_error(context: &'static str) -> impl Fn(anyhow::Error) -> HttpError {
    move |error| {
        tracing::error!(%error, context, "admin MFA operation failed");
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            "Multi-factor authentication is unavailable.".to_string(),
        )
    }
}

pub async fn begin_enrollment(
    pool: &PgPool,
    identity: &AdminIdentity,
    config: &MfaConfig,
) -> Result<dto::AdminMfaEnrollmentStart, HttpError> {
    let key = config
        .encryption_key()
        .map_err(map_mfa_error("enrollment start"))?;
    // At most one live QR at a time.
    db::expire_admin_mfa_enrollment_challenges(pool, identity.user_id)
        .await
        .map_err(map_mfa_error("enrollment start"))?;

    let mut secret = vec![0_u8; SECRET_BYTES];
    OsRng.fill_bytes(&mut secret);
    let totp = build_totp(
        &secret,
        Some("Ekoway Hardware".to_string()),
        identity.username.clone(),
    )
    .map_err(map_mfa_error("enrollment start"))?;
    let otpauth_url = totp.get_url();
    let secret_base32 = totp_rs::Secret::Raw(secret.clone())
        .to_encoded()
        .to_string();

    let (ciphertext, nonce) =
        encrypt_secret(key, &secret).map_err(map_mfa_error("enrollment start"))?;
    // The pending secret lives server-side in an enrollment challenge; the client confirms by
    // typing a code, so the challenge token never leaves the server.
    db::insert_admin_mfa_challenge(
        pool,
        db::NewAdminMfaChallenge {
            admin_user_id: identity.user_id,
            purpose: "enrollment",
            token_hash: &token_hash(&random_token()),
            secret_ciphertext: Some(&ciphertext),
            nonce: Some(&nonce),
            expires_in_seconds: ENROLLMENT_CHALLENGE_SECONDS,
        },
    )
    .await
    .map_err(map_mfa_error("enrollment start"))?;

    Ok(dto::AdminMfaEnrollmentStart {
        otpauth_url,
        secret_base32,
    })
}

pub async fn confirm_enrollment(
    pool: &PgPool,
    identity: &AdminIdentity,
    config: &MfaConfig,
    bearer_token: &str,
    code: &str,
) -> Result<dto::AdminMfaRecoveryCodes, HttpError> {
    let key = config
        .encryption_key()
        .map_err(map_mfa_error("enrollment confirm"))?;

    let Some((challenge_id, Some(ciphertext), Some(nonce))) =
        sqlx::query_as::<_, (uuid::Uuid, Option<Vec<u8>>, Option<Vec<u8>>)>(
            r#"
            SELECT id, secret_ciphertext, nonce
            FROM admin_mfa_challenges
            WHERE admin_user_id = $1
              AND purpose = 'enrollment'
              AND consumed_at IS NULL
              AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(identity.user_id)
        .fetch_optional(pool)
        .await
        .map_err(anyhow::Error::from)
        .map_err(map_mfa_error("enrollment confirm"))?
    else {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "No pending multi-factor enrollment. Start enrollment again.".to_string(),
        ));
    };

    let secret =
        decrypt_secret(key, &ciphertext, &nonce).map_err(map_mfa_error("enrollment confirm"))?;
    let totp = build_totp(&secret, None, "enrollment".to_string())
        .map_err(map_mfa_error("enrollment confirm"))?;
    if verify_totp_code(&totp, code).is_none() {
        return Err((
            axum::http::StatusCode::UNAUTHORIZED,
            "That code did not match. Check your authenticator and try again.".to_string(),
        ));
    }

    db::upsert_admin_factor(pool, identity.user_id, &ciphertext, &nonce)
        .await
        .map_err(map_mfa_error("enrollment confirm"))?;
    db::consume_admin_mfa_challenge(pool, challenge_id)
        .await
        .map_err(map_mfa_error("enrollment confirm"))?;
    // The session that proved possession during enrollment counts as verified.
    sqlx::query("UPDATE admin_sessions SET mfa_verified_at = now() WHERE token = $1")
        .bind(bearer_token)
        .execute(pool)
        .await
        .map_err(anyhow::Error::from)
        .map_err(map_mfa_error("enrollment confirm"))?;

    let recovery_codes = (0..RECOVERY_CODE_COUNT)
        .map(|_| generate_recovery_code())
        .collect::<Vec<_>>();
    let hashes = recovery_codes
        .iter()
        .map(|code| security::hash_password(code))
        .collect::<Result<Vec<_>>>()
        .map_err(map_mfa_error("enrollment confirm"))?;
    db::insert_admin_recovery_codes(pool, identity.user_id, &hashes)
        .await
        .map_err(map_mfa_error("enrollment confirm"))?;

    Ok(dto::AdminMfaRecoveryCodes { recovery_codes })
}

pub async fn disable_factor(
    pool: &PgPool,
    identity: &AdminIdentity,
    config: &MfaConfig,
    input: &dto::AdminMfaDisableInput,
) -> Result<(), HttpError> {
    let key = config.encryption_key().map_err(map_mfa_error("disable"))?;
    let factor = db::fetch_active_admin_factor(pool, identity.user_id)
        .await
        .map_err(map_mfa_error("disable"))?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                "Multi-factor authentication is not enabled on this account.".to_string(),
            )
        })?;
    let secret = decrypt_secret(key, &factor.secret_ciphertext, &factor.nonce)
        .map_err(map_mfa_error("disable"))?;
    let totp =
        build_totp(&secret, None, "disable".to_string()).map_err(map_mfa_error("disable"))?;
    if verify_totp_code(&totp, &input.code).is_none() {
        return Err((
            axum::http::StatusCode::UNAUTHORIZED,
            "That code did not match. Multi-factor authentication stays enabled.".to_string(),
        ));
    }

    // Re-authentication before disable, mirroring password changes elsewhere.
    let verified = db::fetch_admin_user_by_username(pool, &identity.username)
        .await
        .map_err(map_mfa_error("disable"))?
        .filter(|user| user.is_active)
        .is_some_and(|user| security::verify_password(&input.password, &user.password_hash));
    if !verified {
        return Err((
            axum::http::StatusCode::UNAUTHORIZED,
            "Password confirmation failed. Multi-factor authentication stays enabled.".to_string(),
        ));
    }

    db::disable_admin_factor(pool, identity.user_id)
        .await
        .map_err(map_mfa_error("disable"))?;
    audit_event(pool, &identity.username, "disabled").await;
    Ok(())
}

/// Phase one of login: credentials are already proven. Returns the short-lived challenge token
/// that stands in for the session until the authenticator code arrives.
pub async fn create_login_challenge(pool: &PgPool, admin_user_id: i32) -> Result<String> {
    let token = random_token();
    // Housekeeping must never block a login.
    if let Err(error) = db::delete_expired_admin_mfa_challenges(pool).await {
        tracing::warn!(%error, "expired MFA challenge sweep failed");
    }
    db::insert_admin_mfa_challenge(
        pool,
        db::NewAdminMfaChallenge {
            admin_user_id,
            purpose: "login",
            token_hash: &token_hash(&token),
            secret_ciphertext: None,
            nonce: None,
            expires_in_seconds: LOGIN_CHALLENGE_SECONDS,
        },
    )
    .await?;
    Ok(token)
}

pub async fn complete_login(
    pool: &PgPool,
    config: &MfaConfig,
    input: &dto::AdminMfaLoginVerifyInput,
) -> Result<AdminAuthPayload, HttpError> {
    let key = config
        .encryption_key()
        .map_err(map_mfa_error("login verify"))?;
    let challenge_token = input.challenge_token.trim();
    if challenge_token.is_empty() {
        return Err(mfa_login_rejection());
    }

    let Some((challenge_id, admin_user_id, ..)) =
        db::fetch_live_admin_mfa_challenge(pool, "login", &token_hash(challenge_token))
            .await
            .map_err(map_mfa_error("login verify"))?
    else {
        return Err(mfa_login_rejection());
    };

    let factor = db::fetch_active_admin_factor(pool, admin_user_id)
        .await
        .map_err(map_mfa_error("login verify"))?
        .ok_or_else(mfa_login_rejection)?;
    let secret = decrypt_secret(key, &factor.secret_ciphertext, &factor.nonce)
        .map_err(|_| mfa_login_rejection())?;

    let mut verified_step = None;
    let mut used_recovery = false;
    if let Some(code) = input
        .code
        .as_deref()
        .map(str::trim)
        .filter(|code| !code.is_empty())
    {
        let totp = build_totp(&secret, None, "login".to_string())
            .map_err(map_mfa_error("login verify"))?;
        verified_step = verify_totp_code(&totp, code).filter(|&step| {
            factor
                .last_accepted_step
                .is_none_or(|accepted| step > accepted)
        });
    } else if let Some(recovery) = input
        .recovery_code
        .as_deref()
        .map(str::trim)
        .filter(|recovery| !recovery.is_empty())
    {
        // Recovery codes are stored under salted Argon2 hashes, so candidate verification runs
        // against every still-unused code and only the matching row is consumed.
        let candidates = db::fetch_unused_admin_recovery_hashes(pool, admin_user_id)
            .await
            .map_err(map_mfa_error("login verify"))?;
        let matched = candidates
            .into_iter()
            .find(|(_, hash)| security::verify_password(recovery, hash));
        if let Some((row_id, _)) = matched {
            used_recovery = db::consume_admin_recovery_code(pool, row_id)
                .await
                .map_err(map_mfa_error("login verify"))?;
        }
    }

    if verified_step.is_none() && !used_recovery {
        // One wrong code burns an attempt; five exhaust the challenge entirely.
        let exhausted = db::record_admin_mfa_challenge_attempt(pool, challenge_id)
            .await
            .map_err(map_mfa_error("login verify"))?;
        return Err(if exhausted {
            (
                axum::http::StatusCode::UNAUTHORIZED,
                "Too many incorrect codes. Start again with your username and password."
                    .to_string(),
            )
        } else {
            mfa_login_rejection()
        });
    }

    db::consume_admin_mfa_challenge(pool, challenge_id)
        .await
        .map_err(map_mfa_error("login verify"))?;
    if let Some(step) = verified_step {
        sqlx::query(
            "UPDATE admin_mfa_factors SET last_accepted_step = $1 WHERE admin_user_id = $2",
        )
        .bind(step)
        .bind(admin_user_id)
        .execute(pool)
        .await
        .map_err(anyhow::Error::from)
        .map_err(map_mfa_error("login verify"))?;
    }

    let admin_user = db::fetch_admin_user_by_id(pool, admin_user_id)
        .await
        .map_err(map_auth_lookup_error)?
        .filter(|user| user.is_active)
        .ok_or_else(mfa_login_rejection)?;

    let token = security::generate_session_token();
    insert_verified_session(pool, admin_user.id, &token)
        .await
        .map_err(map_auth_lookup_error)?;
    crate::modules::auth::service::build_auth_payload(pool, admin_user, token).await
}
fn mfa_login_rejection() -> HttpError {
    (
        axum::http::StatusCode::UNAUTHORIZED,
        "Multi-factor verification failed.".to_string(),
    )
}

async fn insert_verified_session(pool: &PgPool, admin_user_id: i32, token: &str) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO admin_sessions (token, admin_user_id, expires_at, mfa_verified_at)
        VALUES ($1, $2, now() + interval '7 days', now())
        "#,
    )
    .bind(token)
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    Ok(())
}

async fn audit_event(pool: &PgPool, actor: &str, action: &str) {
    crate::modules::audit::service::record_event(pool, actor, action, "admin_mfa", actor, "").await;
}

fn map_auth_lookup_error(error: anyhow::Error) -> HttpError {
    tracing::error!(%error, "admin auth lookup failed");
    (
        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to verify admin credentials.".to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret_encryption_roundtrips_and_rejects_other_keys() {
        let key = [7_u8; 32];
        let (ciphertext, nonce) = encrypt_secret(&key, b"totp-secret-bytes").unwrap();
        assert_ne!(ciphertext, b"totp-secret-bytes");
        assert_eq!(
            decrypt_secret(&key, &ciphertext, &nonce).unwrap(),
            b"totp-secret-bytes"
        );

        let other_key = [8_u8; 32];
        assert!(decrypt_secret(&other_key, &ciphertext, &nonce).is_err());
    }

    #[test]
    fn config_accepts_exactly_32_bytes_in_base64_or_hex() {
        let base64_key = BASE64.encode([9_u8; 32]);
        unsafe { std::env::set_var("MFA_ENCRYPTION_KEY", &base64_key) };
        assert!(MfaConfig::from_environment().expect("base64").is_enabled());

        let hex_key = hex_encode(&[10_u8; 32]);
        unsafe { std::env::set_var("MFA_ENCRYPTION_KEY", &hex_key) };
        assert!(MfaConfig::from_environment().expect("hex").is_enabled());

        unsafe { std::env::set_var("MFA_ENCRYPTION_KEY", BASE64.encode([11_u8; 31])) };
        assert!(MfaConfig::from_environment().is_err());
        unsafe { std::env::remove_var("MFA_ENCRYPTION_KEY") };
        assert!(!MfaConfig::from_environment().expect("unset").is_enabled());
    }

    #[test]
    fn recovery_codes_use_the_grouped_unambiguous_format() {
        for _ in 0..32 {
            let code = generate_recovery_code();
            assert_eq!(code.len(), 11);
            assert_eq!(code.as_bytes()[5], b'-');
            assert!(
                code.bytes()
                    .all(|byte| byte == b'-' || RECOVERY_ALPHABET.contains(&byte))
            );
        }
    }

    #[test]
    fn totp_verification_matches_adjacent_steps_only() {
        let mut secret = vec![0_u8; SECRET_BYTES];
        OsRng.fill_bytes(&mut secret);
        let totp = build_totp(&secret, None, "test".to_string()).unwrap();
        let now_step = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            / 30;
        let current = totp.generate(now_step * 30);
        let previous = totp.generate((now_step - 1) * 30);
        assert!(verify_totp_code(&totp, &current).is_some());
        assert!(verify_totp_code(&totp, &previous).is_some());
        // A malformed code never matches.
        assert!(verify_totp_code(&totp, "not-a-code").is_none());
    }
}
