use anyhow::Result;
use sqlx::PgPool;

use crate::models::AuditEvent;

pub async fn record_audit_event(
    pool: &PgPool,
    actor: &str,
    action: &str,
    entity_type: &str,
    entity_id: &str,
    detail: &str,
) {
    let result = sqlx::query(
        r#"
        INSERT INTO audit_events (actor, action, entity_type, entity_id, detail)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(actor)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(detail)
    .execute(pool)
    .await;

    if let Err(error) = result {
        tracing::warn!(
            "failed to record audit event ({action} {entity_type} {entity_id}): {error:?}"
        );
    }
}

pub async fn fetch_audit_events(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<AuditEvent>> {
    let rows = match before {
        Some(before_id) => {
            sqlx::query_as::<_, AuditEvent>(
                r#"
                SELECT id, actor, action, entity_type, entity_id, detail,
                       happened_at::text AS happened_at
                FROM audit_events
                WHERE id < $1
                ORDER BY id DESC
                LIMIT $2
                "#,
            )
            .bind(before_id)
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        None => {
            sqlx::query_as::<_, AuditEvent>(
                r#"
                SELECT id, actor, action, entity_type, entity_id, detail,
                       happened_at::text AS happened_at
                FROM audit_events
                ORDER BY id DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(rows)
}
