use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;

const DEFAULT_PAGE_SIZE: i64 = 60;
const MAX_PAGE_SIZE: i64 = 120;

/// Filters shared by the product page query, its matching COUNT, and the per-department
/// counts, so the three can never drift apart and report totals that disagree.
///
/// `include_category` is false when building the department facet: the counts have to show
/// how many products each *other* department holds under the current search and price
/// filters, which they could not do if the selected department were also applied.
fn push_product_filters<'a>(
    builder: &mut sqlx::QueryBuilder<'a, sqlx::Postgres>,
    query: &'a StorefrontQuery,
    include_category: bool,
) {
    if query.on_sale_only.unwrap_or(false) {
        builder.push(" AND badge ILIKE '%sale%'");
    }

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

    if include_category
        && let Some(category) = query
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
}

pub async fn fetch_storefront(pool: &PgPool, query: &StorefrontQuery) -> Result<StorefrontPayload> {
    let categories = sqlx::query_as::<_, Category>(
        r#"
        SELECT slug, name, teaser
        FROM categories
        WHERE slug = 'all'
           OR EXISTS (
               SELECT 1
               FROM products
               WHERE products.category_slug = categories.slug
                 AND products.featured = TRUE
                 AND products.stock_quantity > 0
           )
        ORDER BY sort_order, name, slug
        "#,
    )
    .fetch_all(pool)
    .await?;

    // The catalogue is large enough that returning every match would ship megabytes of JSON
    // on each keystroke-debounced refetch, and render thousands of cards. Page it, and report
    // the full match count so the storefront can say "60 of 7,771".
    let limit = query
        .limit
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let offset = query.offset.unwrap_or(0).max(0);

    let mut count_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM products WHERE featured = true AND stock_quantity > 0",
    );
    push_product_filters(&mut count_builder, query, true);
    let total_products: i64 = count_builder.build_query_scalar().fetch_one(pool).await?;

    // Department facet: how many products each department holds under every filter except
    // the department itself, so a shopper can see where else their search has results.
    let mut facet_builder = sqlx::QueryBuilder::new(
        "SELECT category_slug, COUNT(*)::bigint FROM products WHERE featured = true AND stock_quantity > 0",
    );
    push_product_filters(&mut facet_builder, query, false);
    facet_builder.push(" GROUP BY category_slug");
    let category_counts = facet_builder
        .build_query_as::<CategoryCount>()
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
         WHERE featured = true AND stock_quantity > 0",
    );

    push_product_filters(&mut builder, query, true);

    // Every branch ends with products.id. Imported products all share sort_order = 0, and
    // prices and names repeat freely, so without a unique tiebreaker LIMIT/OFFSET ordering
    // is undefined: page 2 can repeat rows from page 1 and other rows never appear at all.
    builder.push(match query.sort.as_deref() {
        Some("price_asc") => " ORDER BY price_cents ASC, products.id ASC",
        Some("price_desc") => " ORDER BY price_cents DESC, products.id ASC",
        Some("name") => " ORDER BY name ASC, products.id ASC",
        _ => " ORDER BY sort_order, products.id ASC",
    });

    builder.push(" LIMIT ");
    builder.push_bind(limit);
    builder.push(" OFFSET ");
    builder.push_bind(offset);

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
        total_products,
        category_counts,
        promotions,
        services,
        pro_stats,
    })
}

/// Ids of every product the storefront currently publishes — the same visibility rule the
/// catalogue grid applies (featured and in stock), so crawlers only see live product pages.
pub async fn fetch_published_product_ids(pool: &PgPool) -> Result<Vec<i32>> {
    let ids = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM products
        WHERE featured = TRUE AND stock_quantity > 0
        ORDER BY id
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(ids)
}
