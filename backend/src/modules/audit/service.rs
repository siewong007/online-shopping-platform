use anyhow::Result;
use sqlx::PgPool;

use super::{model::AuditEvent, repository};

const DEFAULT_LIMIT: i64 = 50;
const MAX_LIMIT: i64 = 200;

/// Fire-and-forget: an audit hiccup must never fail the business mutation it's
/// recording, so failures are logged (see `db::audit::record_audit_event`) and
/// swallowed here rather than propagated.
pub async fn record_event(
    pool: &PgPool,
    actor: &str,
    action: &str,
    entity_type: &str,
    entity_id: &str,
    detail: &str,
) {
    repository::record_audit_event(pool, actor, action, entity_type, entity_id, detail).await;
}

pub async fn fetch_audit_events(
    pool: &PgPool,
    limit: Option<i64>,
    before: Option<i32>,
) -> Result<Vec<AuditEvent>> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    repository::fetch_audit_events(pool, limit, before).await
}
