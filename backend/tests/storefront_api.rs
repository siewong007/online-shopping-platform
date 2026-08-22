mod common;

use axum::http::{Method, StatusCode};
use sqlx::PgPool;

async fn publish_seed_products(pool: &PgPool) {
    sqlx::query("UPDATE products SET featured = TRUE WHERE source_item_code = ''")
        .execute(pool)
        .await
        .expect("publish storefront test fixtures");
}

#[sqlx::test]
async fn storefront_search_matches_name_and_description_case_insensitively(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(
        app.clone(),
        Method::GET,
        "/api/storefront?q=MILWAUKEE",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["name"], "Milwaukee M18 9-Tool Combo Kit");

    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/storefront?q=WASHABILITY",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    assert_eq!(products.len(), 1);
    assert_eq!(
        products[0]["name"],
        "BEHR Ultra Scuff Defense Interior Paint"
    );
}

#[sqlx::test]
async fn storefront_price_bounds_are_inclusive(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/storefront?min_price_cents=2798&max_price_cents=2798",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["name"], "Husky Heavy-Duty Storage Tote 2-Pack");
}

#[sqlx::test]
async fn storefront_category_filter_narrows_results(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/storefront?category=paint",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["category_slug"], "paint");
}

#[sqlx::test]
async fn storefront_no_matches_returns_empty_array_not_404(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/storefront?q=nonexistent-item-zzz",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["products"].as_array().unwrap().len(), 0);
}

#[sqlx::test]
async fn storefront_sort_price_asc_orders_ascending(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(
        app,
        Method::GET,
        "/api/storefront?sort=price_asc",
        None,
        None,
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    let prices: Vec<i64> = products
        .iter()
        .map(|product| product["price_cents"].as_i64().unwrap())
        .collect();
    let mut sorted = prices.clone();
    sorted.sort();
    assert_eq!(prices, sorted);
}

#[sqlx::test]
async fn storefront_without_params_matches_previous_shape(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/storefront", None, None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["products"].as_array().unwrap().len(), 8);
    assert!(body["categories"].as_array().is_some());
    assert!(body["promotions"].as_array().is_some());
}

#[sqlx::test]
async fn storefront_payload_includes_image_url(pool: PgPool) {
    publish_seed_products(&pool).await;
    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/storefront", None, None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let products = body["products"].as_array().expect("products array");
    assert!(!products.is_empty());
    assert!(products.iter().all(|product| {
        product
            .get("image_url")
            .is_some_and(|value| value.is_string())
    }));
}

#[sqlx::test]
async fn storefront_excludes_products_without_positive_stock(pool: PgPool) {
    publish_seed_products(&pool).await;
    sqlx::query(
        r#"
        UPDATE products
        SET stock_quantity = 0
        WHERE name = 'Milwaukee M18 9-Tool Combo Kit'
        "#,
    )
    .execute(&pool)
    .await
    .expect("set product out of stock");

    let app = common::app(pool);
    let (status, body) =
        common::request(app, Method::GET, "/api/storefront?q=MILWAUKEE", None, None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["total_products"], 0);
    assert!(body["products"].as_array().unwrap().is_empty());
}

#[sqlx::test]
async fn sitemap_lists_only_published_product_pages_and_static_routes(pool: PgPool) {
    publish_seed_products(&pool).await;
    // One fixture stays in stock, one is sold out: only the in-stock page may be listed.
    sqlx::query(
        "UPDATE products SET stock_quantity = 0 WHERE name = 'Milwaukee M18 9-Tool Combo Kit'",
    )
    .execute(&pool)
    .await
    .expect("sell out one fixture");

    let app = common::app(pool.clone());
    let (status, body) =
        common::request(app, Method::GET, "/api/storefront/sitemap.xml", None, None).await;
    assert_eq!(status, StatusCode::OK);

    let xml = match &body {
        serde_json::Value::String(text) => text.clone(),
        other => panic!("sitemap should arrive as raw XML text, got {other}"),
    };
    assert!(
        xml.contains("<loc>https://ekowayhardware.com/shop</loc>"),
        "{xml}"
    );
    assert!(xml.contains("/shop/products/"), "{xml}");
    let product_urls = xml.matches("/shop/products/").count();
    let expected = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE featured = TRUE AND stock_quantity > 0",
    )
    .fetch_one(&pool)
    .await
    .expect("count query");
    assert_eq!(product_urls as i64, expected);
    assert!(!xml.contains("0</loc>"));
}
