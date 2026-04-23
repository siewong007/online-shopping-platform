use anyhow::{bail, Result};
use sqlx::PgPool;

use crate::models::{
    ActivityItem, AdminDashboardPayload, AdminMetric, CampaignOption, Category, CreateCategoryInput,
    CreateProductInput, FulfillmentItem, InventoryItem, Product, Promotion, ProStat, ServiceItem,
    StorefrontPayload,
};

pub async fn fetch_storefront(pool: &PgPool) -> Result<StorefrontPayload> {
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
        WHERE featured = true
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let promotions = sqlx::query_as::<_, Promotion>(
        r#"
        SELECT label, title, description
        FROM promotions
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let services = sqlx::query_as::<_, ServiceItem>(
        r#"
        SELECT name, description
        FROM services
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let pro_stats = sqlx::query_as::<_, ProStat>(
        r#"
        SELECT label, value
        FROM pro_stats
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(StorefrontPayload {
        categories,
        products,
        promotions,
        services,
        pro_stats,
    })
}

pub async fn fetch_admin_dashboard(pool: &PgPool) -> Result<AdminDashboardPayload> {
    let metrics = sqlx::query_as::<_, AdminMetric>(
        r#"
        SELECT label, value, detail
        FROM admin_metrics
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let inventory = sqlx::query_as::<_, InventoryItem>(
        r#"
        SELECT department, on_hand, lead_region, status, note
        FROM inventory_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let fulfillment = sqlx::query_as::<_, FulfillmentItem>(
        r#"
        SELECT stage, title, detail
        FROM fulfillment_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let campaigns = sqlx::query_as::<_, CampaignOption>(
        r#"
        SELECT name, description
        FROM campaign_options
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let activity = sqlx::query_as::<_, ActivityItem>(
        r#"
        SELECT happened_at, detail
        FROM activity_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(AdminDashboardPayload {
        metrics,
        inventory,
        fulfillment,
        campaigns,
        activity,
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
