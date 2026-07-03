use anyhow::Result;
use sqlx::PgPool;

use super::model::AuditEvent;

pub async fn record_audit_event(
    pool: &PgPool,
    actor: &str,
    action: &str,
    entity_type: &str,
    entity_id: &str,
    detail: &str,
) {
    crate::db::record_audit_event(pool, actor, action, entity_type, entity_id, detail).await
}

pub async fn fetch_audit_events(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<AuditEvent>> {
    crate::db::fetch_audit_events(pool, limit, before).await
}
