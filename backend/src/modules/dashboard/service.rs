use anyhow::Result;
use sqlx::PgPool;

use super::{dto::AdminDashboardPayload, repository};

pub async fn fetch_admin_dashboard(pool: &PgPool) -> Result<AdminDashboardPayload> {
    repository::fetch_admin_dashboard(pool).await
}
