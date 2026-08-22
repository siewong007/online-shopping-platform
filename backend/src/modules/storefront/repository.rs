use anyhow::Result;
use sqlx::PgPool;

use super::dto::{StorefrontPayload, StorefrontQuery};

pub async fn fetch_storefront(pool: &PgPool, query: &StorefrontQuery) -> Result<StorefrontPayload> {
    crate::db::fetch_storefront(pool, query).await
}

pub async fn fetch_published_product_ids(pool: &PgPool) -> Result<Vec<i32>> {
    crate::db::fetch_published_product_ids(pool).await
}
