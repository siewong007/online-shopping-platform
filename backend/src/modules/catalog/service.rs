use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateCategoryInput, CreateProductInput, UpdateProductInput},
    model::{Category, Product},
    repository,
};

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    repository::create_category(pool, input).await
}

pub async fn create_product(pool: &PgPool, input: &CreateProductInput) -> Result<Product> {
    repository::create_product(pool, input).await
}

pub async fn update_product(
    pool: &PgPool,
    product_id: i32,
    input: &UpdateProductInput,
) -> Result<Product> {
    repository::update_product(pool, product_id, input).await
}
