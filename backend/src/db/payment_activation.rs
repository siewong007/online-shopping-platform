use anyhow::Result;
use sqlx::PgPool;

pub struct NewPaymentActivationGrant<'a> {
    pub token_sha256: &'a str,
    pub label: &'a str,
    pub issued_by: &'a str,
    pub expires_in_minutes: i32,
}

pub struct PaymentActivationGrantRecord {
    pub id: i64,
    pub expires_at: String,
}

pub async fn create_payment_activation_grant(
    pool: &PgPool,
    grant: &NewPaymentActivationGrant<'_>,
) -> Result<PaymentActivationGrantRecord> {
    let (id, expires_at) = sqlx::query_as::<_, (i64, String)>(
        r#"
        INSERT INTO payment_activation_grants (token_sha256, label, issued_by, expires_at)
        VALUES ($1, $2, $3, now() + make_interval(mins => $4))
        RETURNING id, expires_at::text
        "#,
    )
    .bind(grant.token_sha256)
    .bind(grant.label)
    .bind(grant.issued_by)
    .bind(grant.expires_in_minutes)
    .fetch_one(pool)
    .await?;

    Ok(PaymentActivationGrantRecord { id, expires_at })
}

/// Claims a controlled-mode authorization. Expiry and single use are enforced inside one
/// statement, so the check and the consumption cannot drift apart: PostgreSQL takes the row lock
/// before applying `SET`, and a second concurrent claim re-evaluates `consumed_at IS NULL` against
/// the committed row it was waiting on. Two requests presenting the same secret therefore return
/// at most one row between them, no matter which API process serves them.
pub async fn consume_payment_activation_grant(
    pool: &PgPool,
    token_sha256: &str,
) -> Result<Option<i64>> {
    sqlx::query_scalar::<_, i64>(
        r#"
        UPDATE payment_activation_grants
        SET consumed_at = now()
        WHERE token_sha256 = $1
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING id
        "#,
    )
    .bind(token_sha256)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}
