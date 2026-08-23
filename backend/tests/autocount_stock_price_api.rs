mod common;

use axum::{
    Router,
    http::{HeaderValue, Method, StatusCode},
};
use online_shopping_api::{
    app_state::AppState, modules::payments::activation::PaymentActivationMode, routes,
};
use sqlx::PgPool;

fn app(pool: PgPool) -> Router {
    routes::build_router(
        AppState::with_payment_activation_mode(pool, PaymentActivationMode::Public)
            .with_autocount_sync_token("sync-token-test"),
        HeaderValue::from_static("http://localhost:5173"),
    )
}

fn disabled_app(pool: PgPool) -> Router {
    common::app(pool)
}

async fn insert_item(
    pool: &PgPool,
    code: &str,
    uom: &str,
    price_cents: i32,
    qty: i32,
    featured: bool,
) {
    sqlx::query(
        r#"
        INSERT INTO products (
            name, category_slug, price_cents, badge, description, tone, featured,
            sort_order, stock_quantity, low_stock_threshold, source_item_code, source_uom
        )
        VALUES ($1, 'tools', $2, '', '', 'neutral', $3, 0, $4, 1, $5, $6)
        "#,
    )
    .bind(format!("{code} {uom}"))
    .bind(price_cents)
    .bind(featured)
    .bind(qty)
    .bind(code)
    .bind(uom)
    .execute(pool)
    .await
    .expect("product should insert");
}

#[sqlx::test]
async fn rejects_when_token_is_not_configured(pool: PgPool) {
    let (status, body) = common::request_text(
        disabled_app(pool),
        Method::POST,
        "/api/integrations/autocount/stock-price",
        Some("sync-token-test"),
        "text/csv",
        "Item Code,Price 1,Total Bal. Qty\nA,1,1\n",
    )
    .await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
}

#[sqlx::test]
async fn rejects_wrong_token(pool: PgPool) {
    let (status, body) = common::request_text(
        app(pool),
        Method::POST,
        "/api/integrations/autocount/stock-price",
        Some("nope"),
        "text/csv",
        "Item Code,Price 1,Total Bal. Qty\nA,1,1\n",
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body}");
}

#[sqlx::test]
async fn applies_price_1_and_qty_by_item_code(pool: PgPool) {
    insert_item(&pool, "CABLE-1", "COIL", 174_900, 4, true).await;
    insert_item(&pool, "CABLE-1", "MTR", 1_290, 10, true).await;
    insert_item(&pool, "GLOVE-1", "DOZ", 18_900, 2, true).await;

    let csv = concat!(
        "Item Code,Base UOM,Description,Price 1,Is Active,Total Bal. Qty,Last Cost\n",
        "CABLE-1,MTR,Flex,12.90,Checked,22,99.00\n",
        "GLOVE-1,PAIR,Glove,15.90,Checked,5,1.00\n",
        "UNKNOWN-1,PCS,Skip me,3.00,Checked,1,\n"
    );

    let (status, body) = common::request_text(
        app(pool.clone()),
        Method::POST,
        "/api/integrations/autocount/stock-price",
        Some("sync-token-test"),
        "text/csv",
        csv,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["rows_read"], 3);
    assert_eq!(body["products_matched"], 2);
    assert_eq!(body["unmatched"], 1);
    assert!(body["products_updated"].as_u64().unwrap() >= 1);

    let cable_mtr: (i32, i32, bool) = sqlx::query_as(
        r#"
        SELECT price_cents, stock_quantity, featured
        FROM products
        WHERE source_item_code = 'CABLE-1' AND source_uom = 'MTR'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("metre row");
    assert_eq!(cable_mtr, (1290, 22, true));

    let cable_coil_featured: bool = sqlx::query_scalar(
        "SELECT featured FROM products WHERE source_item_code = 'CABLE-1' AND source_uom = 'COIL'",
    )
    .fetch_one(&pool)
    .await
    .expect("coil row");
    assert!(!cable_coil_featured, "extra unit listing should be hidden");

    let glove: (String, i32, i32) = sqlx::query_as(
        r#"
        SELECT source_uom, price_cents, stock_quantity
        FROM products
        WHERE source_item_code = 'GLOVE-1'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("glove row");
    assert_eq!(glove, ("PAIR".to_string(), 1590, 5));
}
