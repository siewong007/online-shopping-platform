use anyhow::Result;
use sqlx::PgPool;

use super::{dto::CreateReviewInput, model::ProductDetailPayload};
use crate::modules::reviews::model::ProductReview;

pub async fn fetch_product_detail(
    pool: &PgPool,
    product_id: i32,
    customer_account_id: Option<i32>,
) -> Result<Option<ProductDetailPayload>> {
    crate::db::fetch_product_detail(pool, product_id, customer_account_id).await
}

pub async fn create_product_review(
    pool: &PgPool,
    product_id: i32,
    customer_account_id: i32,
    input: &CreateReviewInput,
) -> Result<ProductReview> {
    crate::db::create_product_review(pool, product_id, customer_account_id, input).await
}
