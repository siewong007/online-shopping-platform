use anyhow::Result;
use sqlx::PgPool;

use super::{dto::StorefrontPayload, repository};

pub async fn fetch_storefront(pool: &PgPool) -> Result<StorefrontPayload> {
    repository::fetch_storefront(pool).await
}
