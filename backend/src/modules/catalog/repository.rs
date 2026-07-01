use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateCategoryInput, CreateProductInput},
    model::{Category, Product},
};

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    crate::db::create_category(pool, input).await
}

pub async fn create_product(pool: &PgPool, input: &CreateProductInput) -> Result<Product> {
    crate::db::create_product(pool, input).await
}
