use anyhow::Result;
use sqlx::{FromRow, PgPool};

#[derive(Debug, Clone, FromRow)]
pub struct QueuedEmail {
    pub id: i64,
    pub recipient: String,
    pub subject: String,
    pub body: String,
}

pub async fn enqueue_email(
    pool: &PgPool,
    recipient: &str,
    subject: &str,
    body: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO email_outbox (recipient, subject, body)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(recipient)
    .bind(subject)
    .bind(body)
    .execute(pool)
    .await?;
    Ok(())
}

/// Claims the next batch of due emails. `FOR UPDATE SKIP LOCKED` keeps concurrent passes from
/// double-sending; the locks live only for this transaction, the row status is what persists.
pub async fn claim_due_emails(pool: &PgPool) -> Result<Vec<QueuedEmail>> {
    let mut tx = pool.begin().await?;
    let rows = sqlx::query_as::<_, QueuedEmail>(
        r#"
        SELECT id, recipient, subject, body
        FROM email_outbox
        WHERE status <> 'sent' AND attempts < 5 AND next_attempt_at <= now()
        ORDER BY id
        LIMIT 20
        FOR UPDATE SKIP LOCKED
        "#,
    )
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(rows)
}

pub async fn mark_email_sent(pool: &PgPool, id: i64) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE email_outbox
        SET status = 'sent', sent_at = now(), last_error = ''
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Records a failed attempt with an exponential backoff (`2^attempts` minutes). After five
/// attempts the status flips to terminal `failed`; returns that status so callers can react.
pub async fn mark_email_failed(pool: &PgPool, id: i64, error: &str) -> Result<String> {
    let (status,): (String,) = sqlx::query_as(
        r#"
        UPDATE email_outbox
        SET attempts = attempts + 1,
            last_error = $2,
            status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE status END,
            next_attempt_at = now() + make_interval(mins => (2 ^ (attempts + 1))::int)
        WHERE id = $1
        RETURNING status
        "#,
    )
    .bind(id)
    .bind(error)
    .fetch_one(pool)
    .await?;
    Ok(status)
}
