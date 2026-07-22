use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

fn validate_image_url(image_url: &str) -> Result<()> {
    let lower = image_url.to_ascii_lowercase();
    if !image_url.is_empty() && !lower.starts_with("http://") && !lower.starts_with("https://") {
        bail!("Image URL must be empty or start with http:// or https://.");
    }

    Ok(())
}

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
        SELECT products.id, products.name, products.category_slug, products.price_cents, products.badge,
               products.description, products.tone, products.featured, products.stock_quantity,
               products.low_stock_threshold, products.image_url,
               review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count
        FROM products
        LEFT JOIN (
            SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count
            FROM product_reviews GROUP BY product_id
        ) review_stats ON review_stats.product_id = products.id
        ORDER BY products.sort_order
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

    let image_url = input.image_url.as_deref().unwrap_or("").trim();
    validate_image_url(image_url)?;

    sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (name, category_slug, price_cents, badge, description, tone, featured, stock_quantity, low_stock_threshold, image_url, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, category_slug, price_cents, badge, description, tone, featured, stock_quantity, low_stock_threshold, image_url,
                  NULL::float8 AS avg_rating, 0::bigint AS review_count
        "#,
    )
    .bind(name)
    .bind(category_slug)
    .bind(input.price_cents)
    .bind(badge)
    .bind(description)
    .bind(tone)
    .bind(input.featured)
    .bind(input.stock_quantity)
    .bind(input.low_stock_threshold)
    .bind(image_url)
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

    let image_url = input.image_url.as_deref().unwrap_or("").trim();
    validate_image_url(image_url)?;

    sqlx::query_as::<_, Product>(
        r#"
        WITH updated AS (
            UPDATE products
            SET name = $1,
                category_slug = $2,
                price_cents = $3,
                badge = $4,
                description = $5,
                tone = $6,
                featured = $7,
                stock_quantity = $8,
                low_stock_threshold = $9,
                image_url = $10
            WHERE id = $11
            RETURNING id, name, category_slug, price_cents, badge, description, tone, featured, stock_quantity, low_stock_threshold, image_url
        )
        SELECT updated.*, review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count
        FROM updated
        LEFT JOIN (
            SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count
            FROM product_reviews GROUP BY product_id
        ) review_stats ON review_stats.product_id = updated.id
        "#,
    )
    .bind(name)
    .bind(category_slug)
    .bind(input.price_cents)
    .bind(badge)
    .bind(description)
    .bind(tone)
    .bind(input.featured)
    .bind(input.stock_quantity)
    .bind(input.low_stock_threshold)
    .bind(image_url)
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

pub async fn update_product_stock(
    pool: &PgPool,
    product_id: i32,
    input: &UpdateProductStockInput,
) -> Result<Product> {
    if input.stock_quantity < 0 {
        bail!("Stock quantity cannot be negative.");
    }
    if input.low_stock_threshold < 0 {
        bail!("Low stock threshold cannot be negative.");
    }

    sqlx::query_as::<_, Product>(
        r#"
        WITH updated AS (
            UPDATE products
            SET stock_quantity = $1,
                low_stock_threshold = $2
            WHERE id = $3
            RETURNING id, name, category_slug, price_cents, badge, description, tone, featured, stock_quantity, low_stock_threshold, image_url
        )
        SELECT updated.*, review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count
        FROM updated
        LEFT JOIN (
            SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count
            FROM product_reviews GROUP BY product_id
        ) review_stats ON review_stats.product_id = updated.id
        "#,
    )
    .bind(input.stock_quantity)
    .bind(input.low_stock_threshold)
    .bind(product_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Product not found."))
}

pub async fn supplier_sync(pool: &PgPool) -> Result<Vec<ProductRestockResult>> {
    let low_stock_products = sqlx::query_as::<_, Product>(
        r#"
        SELECT products.id, products.name, products.category_slug, products.price_cents, products.badge,
               products.description, products.tone, products.featured, products.stock_quantity,
               products.low_stock_threshold, products.image_url,
               review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count
        FROM products
        LEFT JOIN (
            SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count
            FROM product_reviews GROUP BY product_id
        ) review_stats ON review_stats.product_id = products.id
        WHERE stock_quantity <= low_stock_threshold
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut restocked: Vec<ProductRestockResult> = Vec::new();
    for product in low_stock_products {
        // Restock to a target level (double the threshold as the target)
        let target_stock = product.low_stock_threshold * 2;
        let added = target_stock - product.stock_quantity;

        sqlx::query(
            r#"
            UPDATE products
            SET stock_quantity = $1
            WHERE id = $2
            "#,
        )
        .bind(target_stock)
        .bind(product.id)
        .execute(pool)
        .await?;

        restocked.push(ProductRestockResult {
            product_id: product.id,
            name: product.name,
            added,
        });
    }

    Ok(restocked)
}
