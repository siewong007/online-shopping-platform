use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    dto::{
        CreateCategoryInput, CreateProductInput, UpdateCategoryInput, UpdateProductInput,
        UpdateProductStockInput,
    },
    model::{AdminCatalogPayload, Category, Product, ProductRestockResult},
    repository,
};

pub async fn fetch_admin_catalog(pool: &PgPool) -> Result<AdminCatalogPayload> {
    repository::fetch_admin_catalog(pool).await
}

pub async fn create_category(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreateCategoryInput,
) -> Result<Category> {
    let category = repository::create_category(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "category",
        &category.slug,
        &category.name,
    )
    .await;
    Ok(category)
}

pub async fn update_category(
    pool: &PgPool,
    identity: &AdminIdentity,
    slug: &str,
    input: &UpdateCategoryInput,
) -> Result<Category> {
    let category = repository::update_category(pool, slug, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "category",
        &category.slug,
        &category.name,
    )
    .await;
    Ok(category)
}

pub async fn delete_category(pool: &PgPool, identity: &AdminIdentity, slug: &str) -> Result<()> {
    repository::delete_category(pool, slug).await?;
    audit::service::record_event(pool, &identity.username, "delete", "category", slug, "").await;
    Ok(())
}

pub async fn create_product(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreateProductInput,
) -> Result<Product> {
    let product = repository::create_product(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "product",
        &product.id.to_string(),
        &product.name,
    )
    .await;
    Ok(product)
}

pub async fn update_product(
    pool: &PgPool,
    identity: &AdminIdentity,
    product_id: i32,
    input: &UpdateProductInput,
) -> Result<Product> {
    let product = repository::update_product(pool, product_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "product",
        &product.id.to_string(),
        &product.name,
    )
    .await;
    Ok(product)
}

pub async fn delete_product(
    pool: &PgPool,
    identity: &AdminIdentity,
    product_id: i32,
) -> Result<()> {
    repository::delete_product(pool, product_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "product",
        &product_id.to_string(),
        "",
    )
    .await;
    Ok(())
}

pub async fn update_product_stock(
    pool: &PgPool,
    identity: &AdminIdentity,
    product_id: i32,
    input: &UpdateProductStockInput,
) -> Result<Product> {
    let product = repository::update_product_stock(pool, product_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "product_stock",
        &product.id.to_string(),
        &product.name,
    )
    .await;
    Ok(product)
}

pub async fn run_supplier_sync(pool: &PgPool) -> Result<Vec<ProductRestockResult>> {
    repository::run_supplier_sync(pool).await
}
