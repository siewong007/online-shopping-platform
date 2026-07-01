use anyhow::Result;
use sqlx::PgPool;

use super::dto::AdminDashboardPayload;

pub async fn fetch_admin_dashboard(pool: &PgPool) -> Result<AdminDashboardPayload> {
    crate::db::fetch_admin_dashboard(pool).await
}
