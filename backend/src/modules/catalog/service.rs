use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateCategoryInput, CreateProductInput, UpdateCategoryInput, UpdateProductInput},
    model::{AdminCatalogPayload, Category, Product},
    repository,
};

pub async fn fetch_admin_catalog(pool: &PgPool) -> Result<AdminCatalogPayload> {
    repository::fetch_admin_catalog(pool).await
}

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    repository::create_category(pool, input).await
}

pub async fn update_category(
    pool: &PgPool,
    slug: &str,
    input: &UpdateCategoryInput,
) -> Result<Category> {
    repository::update_category(pool, slug, input).await
}

pub async fn delete_category(pool: &PgPool, slug: &str) -> Result<()> {
    repository::delete_category(pool, slug).await
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

pub async fn delete_product(pool: &PgPool, product_id: i32) -> Result<()> {
    repository::delete_product(pool, product_id).await
}
