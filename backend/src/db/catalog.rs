use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

pub async fn fetch_admin_catalog(pool: &PgPool) -> Result<AdminCatalogPayload> {
    let categories = sqlx::query_as::<_, Category>(
        r#"
        SELECT slug, name, teaser
        FROM categories
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let products = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, name, category_slug, price_cents, badge, description, tone, featured
        FROM products
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(AdminCatalogPayload {
        categories,
        products,
    })
}

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    let slug = input.slug.trim();
    let name = input.name.trim();
    let teaser = input.teaser.trim();

    if slug.is_empty() || name.is_empty() || teaser.is_empty() {
        bail!("Category slug, name and teaser are required.");
    }

    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)
        "#,
    )
    .bind(slug)
    .fetch_one(pool)
    .await?;

    if exists {
        bail!("A category with that slug already exists.");
    }

    let next_sort_order = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM categories
        "#,
    )
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (slug, name, teaser, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING slug, name, teaser
        "#,
    )
    .bind(slug)
    .bind(name)
    .bind(teaser)
    .bind(next_sort_order)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_category(
    pool: &PgPool,
    slug: &str,
    input: &UpdateCategoryInput,
) -> Result<Category> {
    let name = input.name.trim();
    let teaser = input.teaser.trim();

    if name.is_empty() || teaser.is_empty() {
        bail!("Category name and teaser are required.");
    }

    sqlx::query_as::<_, Category>(
        r#"
        UPDATE categories
        SET name = $1,
            teaser = $2
        WHERE slug = $3
        RETURNING slug, name, teaser
        "#,
    )
    .bind(name)
    .bind(teaser)
    .bind(slug)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Category not found."))
}

pub async fn delete_category(pool: &PgPool, slug: &str) -> Result<()> {
    let product_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM products
        WHERE category_slug = $1
        "#,
    )
    .bind(slug)
    .fetch_one(pool)
    .await?;

    if product_count > 0 {
        bail!("Reassign {product_count} product(s) out of this category first.");
    }

    let result = sqlx::query(
        r#"
        DELETE FROM categories
        WHERE slug = $1
        "#,
    )
    .bind(slug)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Category not found.");
    }

    Ok(())
}

pub async fn create_product(pool: &PgPool, input: &CreateProductInput) -> Result<Product> {
    let name = input.name.trim();
    let category_slug = input.category_slug.trim();
    let badge = input.badge.trim();
    let description = input.description.trim();
    let tone = input.tone.trim();

    if name.is_empty()
        || category_slug.is_empty()
        || badge.is_empty()
        || description.is_empty()
        || tone.is_empty()
    {
        bail!("Product name, category, badge, tone and description are required.");
    }

    if input.price_cents < 0 {
        bail!("Product price must be zero or greater.");
    }

    let category_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)
        "#,
    )
    .bind(category_slug)
    .fetch_one(pool)
    .await?;

    if !category_exists {
        bail!("Select a valid category before creating a product.");
    }

    let next_sort_order = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM products
        "#,
    )
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (name, category_slug, price_cents, badge, description, tone, featured, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, category_slug, price_cents, badge, description, tone, featured
        "#,
    )
    .bind(name)
    .bind(category_slug)
    .bind(input.price_cents)
    .bind(badge)
    .bind(description)
    .bind(tone)
    .bind(input.featured)
    .bind(next_sort_order)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_product(
    pool: &PgPool,
    product_id: i32,
    input: &UpdateProductInput,
) -> Result<Product> {
    let name = input.name.trim();
    let category_slug = input.category_slug.trim();
    let badge = input.badge.trim();
    let description = input.description.trim();
    let tone = input.tone.trim();

    if name.is_empty()
        || category_slug.is_empty()
        || badge.is_empty()
        || description.is_empty()
        || tone.is_empty()
    {
        bail!("Product name, category, badge, tone and description are required.");
    }

    if input.price_cents < 0 {
        bail!("Product price must be zero or greater.");
    }

    let category_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)
        "#,
    )
    .bind(category_slug)
    .fetch_one(pool)
    .await?;

    if !category_exists {
        bail!("Select a valid category before updating a product.");
    }

    sqlx::query_as::<_, Product>(
        r#"
        UPDATE products
        SET name = $1,
            category_slug = $2,
            price_cents = $3,
            badge = $4,
            description = $5,
            tone = $6,
            featured = $7
        WHERE id = $8
        RETURNING id, name, category_slug, price_cents, badge, description, tone, featured
        "#,
    )
    .bind(name)
    .bind(category_slug)
    .bind(input.price_cents)
    .bind(badge)
    .bind(description)
    .bind(tone)
    .bind(input.featured)
    .bind(product_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Product not found."))
}

pub async fn delete_product(pool: &PgPool, product_id: i32) -> Result<()> {
    let result = sqlx::query(
        r#"
        DELETE FROM products
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Product not found.");
    }

    Ok(())
}
