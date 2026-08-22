use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{StorefrontPayload, StorefrontQuery},
    repository,
};

pub async fn fetch_storefront(pool: &PgPool, query: &StorefrontQuery) -> Result<StorefrontPayload> {
    repository::fetch_storefront(pool, query).await
}

pub async fn fetch_published_product_ids(pool: &PgPool) -> Result<Vec<i32>> {
    repository::fetch_published_product_ids(pool).await
}
