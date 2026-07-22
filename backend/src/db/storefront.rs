use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;

pub async fn fetch_storefront(pool: &PgPool, query: &StorefrontQuery) -> Result<StorefrontPayload> {
    let categories = sqlx::query_as::<_, Category>(
        r#"
        SELECT slug, name, teaser
        FROM categories
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut builder = sqlx::QueryBuilder::new(
        "SELECT products.id, products.name, products.category_slug, products.price_cents, products.badge, \
         products.description, products.tone, products.featured, products.stock_quantity, products.low_stock_threshold, \
         products.image_url, review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count \
         FROM products \
         LEFT JOIN ( \
             SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count \
             FROM product_reviews GROUP BY product_id \
         ) review_stats ON review_stats.product_id = products.id \
         WHERE featured = true",
    );

    if let Some(text) = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|text| !text.is_empty())
    {
        let escaped = text
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let pattern = format!("%{escaped}%");
        builder.push(" AND (name ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" ESCAPE '\\' OR description ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" ESCAPE '\\' OR badge ILIKE ");
        builder.push_bind(pattern);
        builder.push(" ESCAPE '\\')");
    }

    if let Some(category) = query
        .category
        .as_deref()
        .map(str::trim)
        .filter(|category| !category.is_empty() && *category != "all")
    {
        builder.push(" AND category_slug = ");
        builder.push_bind(category.to_string());
    }

    if let Some(min_price_cents) = query.min_price_cents {
        builder.push(" AND price_cents >= ");
        builder.push_bind(min_price_cents);
    }

    if let Some(max_price_cents) = query.max_price_cents {
        builder.push(" AND price_cents <= ");
        builder.push_bind(max_price_cents);
    }

    builder.push(match query.sort.as_deref() {
        Some("price_asc") => " ORDER BY price_cents ASC",
        Some("price_desc") => " ORDER BY price_cents DESC",
        Some("name") => " ORDER BY name ASC",
        _ => " ORDER BY sort_order",
    });

    let products = builder.build_query_as::<Product>().fetch_all(pool).await?;

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
