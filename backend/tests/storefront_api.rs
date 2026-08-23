mod common;

use axum::http::{Method, StatusCode};
use serde_json::json;
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
async fn public_quote_rejects_delivery_until_it_is_enabled(pool: PgPool) {
    publish_seed_products(&pool).await;
    let product_id = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM products WHERE name = 'Milwaukee M18 9-Tool Combo Kit'",
    )
    .fetch_one(&pool)
    .await
    .expect("seed product");
    let app = common::app(pool);
    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/checkout/quote",
        None,
        Some(json!({
            "items": [{ "product_id": product_id, "quantity": 1 }],
            "fulfillment_method": "delivery"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
    let message = body.as_str().unwrap_or_default();
    assert!(
        message.contains("Online delivery is not available"),
        "{body}"
    );
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
