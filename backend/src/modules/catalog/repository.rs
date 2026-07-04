use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{
        CreateCategoryInput, CreateProductInput, UpdateCategoryInput, UpdateProductInput,
        UpdateProductStockInput,
    },
    model::{AdminCatalogPayload, Category, Product, ProductRestockResult},
};

pub async fn fetch_admin_catalog(pool: &PgPool) -> Result<AdminCatalogPayload> {
    crate::db::fetch_admin_catalog(pool).await
}

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    crate::db::create_category(pool, input).await
}

pub async fn update_category(
    pool: &PgPool,
    slug: &str,
    input: &UpdateCategoryInput,
) -> Result<Category> {
    crate::db::update_category(pool, slug, input).await
}

pub async fn delete_category(pool: &PgPool, slug: &str) -> Result<()> {
    crate::db::delete_category(pool, slug).await
}

pub async fn create_product(pool: &PgPool, input: &CreateProductInput) -> Result<Product> {
    crate::db::create_product(pool, input).await
}

pub async fn update_product(
    pool: &PgPool,
    product_id: i32,
    input: &UpdateProductInput,
) -> Result<Product> {
    crate::db::update_product(pool, product_id, input).await
}

pub async fn delete_product(pool: &PgPool, product_id: i32) -> Result<()> {
    crate::db::delete_product(pool, product_id).await
}

pub async fn update_product_stock(
    pool: &PgPool,
    product_id: i32,
    input: &UpdateProductStockInput,
) -> Result<Product> {
    crate::db::update_product_stock(pool, product_id, input).await
}

pub async fn run_supplier_sync(pool: &PgPool) -> Result<Vec<ProductRestockResult>> {
    crate::db::supplier_sync(pool).await
}
