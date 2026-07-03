use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{StorefrontPayload, StorefrontQuery},
    repository,
};

pub async fn fetch_storefront(pool: &PgPool, query: &StorefrontQuery) -> Result<StorefrontPayload> {
    repository::fetch_storefront(pool, query).await
}
