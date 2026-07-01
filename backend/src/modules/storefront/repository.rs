use anyhow::Result;
use sqlx::PgPool;

use super::dto::StorefrontPayload;

pub async fn fetch_storefront(pool: &PgPool) -> Result<StorefrontPayload> {
    crate::db::fetch_storefront(pool).await
}
