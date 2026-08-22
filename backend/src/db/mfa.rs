use anyhow::Result;
use sqlx::PgPool;

/// One row of `admin_mfa_factors` for an active (not disabled) factor.
#[derive(Debug, sqlx::FromRow)]
pub struct AdminMfaFactorRow {
    pub admin_user_id: i32,
    pub secret_ciphertext: Vec<u8>,
    pub nonce: Vec<u8>,
    pub key_version: i16,
    pub last_accepted_step: Option<i64>,
}

pub async fn fetch_active_admin_factor(
    pool: &PgPool,
    admin_user_id: i32,
) -> Result<Option<AdminMfaFactorRow>> {
    sqlx::query_as::<_, AdminMfaFactorRow>(
        r#"
        SELECT admin_user_id,
               secret_ciphertext,
               nonce,
               key_version,
               last_accepted_step
        FROM admin_mfa_factors
        WHERE admin_user_id = $1
          AND disabled_at IS NULL
        "#,
    )
    .bind(admin_user_id)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

/// Enrollment replaces any prior factor only after its challenge is confirmed; this upsert runs
/// at confirm time so a half-finished enrollment never leaves a lockable factor behind.
pub async fn upsert_admin_factor(
    pool: &PgPool,
    admin_user_id: i32,
    secret_ciphertext: &[u8],
    nonce: &[u8],
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO admin_mfa_factors
            (admin_user_id, secret_ciphertext, nonce, key_version, last_accepted_step)
        VALUES ($1, $2, $3, 1, NULL)
        ON CONFLICT (admin_user_id) DO UPDATE
        SET secret_ciphertext = EXCLUDED.secret_ciphertext,
            nonce = EXCLUDED.nonce,
            key_version = EXCLUDED.key_version,
            last_accepted_step = NULL,
            enrolled_at = now(),
            disabled_at = NULL
        "#,
    )
    .bind(admin_user_id)
    .bind(secret_ciphertext)
    .bind(nonce)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn disable_admin_factor(pool: &PgPool, admin_user_id: i32) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE admin_mfa_factors
        SET disabled_at = now()
        WHERE admin_user_id = $1
          AND disabled_at IS NULL
        "#,
    )
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    // A disabled factor must not leave reusable recovery codes behind.
    sqlx::query("DELETE FROM admin_mfa_recovery_codes WHERE admin_user_id = $1")
        .bind(admin_user_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// One new challenge row; only the token hash is stored, so a database read cannot be replayed
/// as a login and the plaintext token exists solely in the response that carries it.
pub struct NewAdminMfaChallenge<'a> {
    pub admin_user_id: i32,
    pub purpose: &'a str,
    pub token_hash: &'a str,
    pub secret_ciphertext: Option<&'a [u8]>,
    pub nonce: Option<&'a [u8]>,
    pub expires_in_seconds: i64,
}

pub async fn insert_admin_mfa_challenge(
    pool: &PgPool,
    challenge: NewAdminMfaChallenge<'_>,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO admin_mfa_challenges
            (id, admin_user_id, purpose, token_hash, secret_ciphertext, nonce, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(secs => $7))
        "#,
    )
    .bind(uuid::Uuid::new_v4())
    .bind(challenge.admin_user_id)
    .bind(challenge.purpose)
    .bind(challenge.token_hash)
    .bind(challenge.secret_ciphertext)
    .bind(challenge.nonce)
    .bind(challenge.expires_in_seconds as f64)
    .execute(pool)
    .await?;

    Ok(())
}

/// Returns (admin_user_id, attempts, secret_ciphertext, nonce) of one live unconsumed challenge.
pub async fn fetch_live_admin_mfa_challenge(
    pool: &PgPool,
    purpose: &str,
    token_hash: &str,
) -> Result<Option<(uuid::Uuid, i32, i16, Option<Vec<u8>>, Option<Vec<u8>>)>> {
    sqlx::query_as::<_, (uuid::Uuid, i32, i16, Option<Vec<u8>>, Option<Vec<u8>>)>(
        r#"
        SELECT id, admin_user_id, attempts, secret_ciphertext, nonce
        FROM admin_mfa_challenges
        WHERE purpose = $1
          AND token_hash = $2
          AND consumed_at IS NULL
          AND expires_at > now()
        "#,
    )
    .bind(purpose)
    .bind(token_hash)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn consume_admin_mfa_challenge(pool: &PgPool, challenge_id: uuid::Uuid) -> Result<()> {
    sqlx::query(
        "UPDATE admin_mfa_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL",
    )
    .bind(challenge_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Counts this failed attempt and reports whether the challenge has exhausted its budget.
pub async fn record_admin_mfa_challenge_attempt(
    pool: &PgPool,
    challenge_id: uuid::Uuid,
) -> Result<bool> {
    let exhausted = sqlx::query_scalar::<_, bool>(
        r#"
        UPDATE admin_mfa_challenges
        SET attempts = attempts + 1
        WHERE id = $1
        RETURNING attempts >= 5
        "#,
    )
    .bind(challenge_id)
    .fetch_one(pool)
    .await?;

    if exhausted {
        sqlx::query("UPDATE admin_mfa_challenges SET consumed_at = now() WHERE id = $1")
            .bind(challenge_id)
            .execute(pool)
            .await?;
    }

    Ok(exhausted)
}

/// Replaces pending enrollment challenges with the new one, so at most one live QR code exists.
pub async fn expire_admin_mfa_enrollment_challenges(
    pool: &PgPool,
    admin_user_id: i32,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE admin_mfa_challenges
        SET consumed_at = now()
        WHERE admin_user_id = $1
          AND purpose = 'enrollment'
          AND consumed_at IS NULL
        "#,
    )
    .bind(admin_user_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_admin_recovery_codes(
    pool: &PgPool,
    admin_user_id: i32,
    code_hashes: &[String],
) -> Result<()> {
    sqlx::query(
        "DELETE FROM admin_mfa_recovery_codes WHERE admin_user_id = $1 AND used_at IS NULL",
    )
    .bind(admin_user_id)
    .execute(pool)
    .await?;
    for code_hash in code_hashes {
        sqlx::query(
            "INSERT INTO admin_mfa_recovery_codes (admin_user_id, code_hash) VALUES ($1, $2)",
        )
        .bind(admin_user_id)
        .bind(code_hash)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// (id, argon2 hash) of every still-unused recovery code for the account.
pub async fn fetch_unused_admin_recovery_hashes(
    pool: &PgPool,
    admin_user_id: i32,
) -> Result<Vec<(i32, String)>> {
    sqlx::query_as::<_, (i32, String)>(
        r#"
        SELECT id, code_hash
        FROM admin_mfa_recovery_codes
        WHERE admin_user_id = $1
          AND used_at IS NULL
        "#,
    )
    .bind(admin_user_id)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

/// Marks one recovery code row as used. Returns false when another request consumed it first.
pub async fn consume_admin_recovery_code(pool: &PgPool, row_id: i32) -> Result<bool> {
    let result = sqlx::query(
        "UPDATE admin_mfa_recovery_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL",
    )
    .bind(row_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn delete_expired_admin_mfa_challenges(pool: &PgPool) -> Result<()> {
    sqlx::query("DELETE FROM admin_mfa_challenges WHERE expires_at <= now() - interval '1 day'")
        .execute(pool)
        .await?;

    Ok(())
}
