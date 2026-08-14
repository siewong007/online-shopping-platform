mod common;

use axum::http::{Method, StatusCode};
use sqlx::PgPool;

#[sqlx::test]
async fn readiness_is_ok_when_critical_schema_is_present(pool: PgPool) {
    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/health", None, None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["status"], "ok");
}

#[sqlx::test]
async fn readiness_fails_closed_when_a_required_migration_is_missing(pool: PgPool) {
    sqlx::query("DROP TABLE product_reviews")
        .execute(&pool)
        .await
        .expect("drop the isolated test database table");

    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/health", None, None).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
    assert_eq!(body, "Service is not ready.");
}

#[sqlx::test]
async fn readiness_fails_closed_when_shipping_schema_is_missing(pool: PgPool) {
    sqlx::query("DROP TABLE shipping_services CASCADE")
        .execute(&pool)
        .await
        .expect("drop the isolated test database shipping tables");

    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/health", None, None).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
    assert_eq!(body, "Service is not ready.");
}

#[sqlx::test]
async fn repair_migration_restores_baselined_schema_without_enabling_shipping(pool: PgPool) {
    sqlx::raw_sql(
        r#"
        DROP TABLE shipping_service_rates;
        DROP TABLE shipping_services;
        DROP TABLE order_shipping_addresses;
        DROP TABLE shipment_events;
        DROP TABLE shipments;
        DROP TABLE admin_mfa_recovery_codes;
        DROP TABLE admin_mfa_challenges;
        DROP TABLE admin_mfa_factors;
        DROP TABLE customer_mfa_recovery_codes;
        DROP TABLE customer_mfa_challenges;
        DROP TABLE customer_mfa_factors;
        ALTER TABLE products DROP COLUMN shipping_class;
        ALTER TABLE order_sales_meta DROP COLUMN shipping_cents;
        ALTER TABLE customer_sessions
            DROP COLUMN user_agent,
            DROP COLUMN last_seen_at,
            DROP COLUMN mfa_verified_at;
        ALTER TABLE admin_sessions DROP COLUMN mfa_verified_at;
        "#,
    )
    .execute(&pool)
    .await
    .expect("reproduce the production baseline drift");

    sqlx::raw_sql(include_str!(
        "../migrations/0034_repair_preledger_schema.sql"
    ))
    .execute(&pool)
    .await
    .expect("apply the forward repair migration");

    let shipping_service_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM shipping_services")
        .fetch_one(&pool)
        .await
        .expect("count repaired shipping services");
    let shipping_rate_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM shipping_service_rates")
            .fetch_one(&pool)
            .await
            .expect("count repaired shipping rates");
    assert_eq!(shipping_service_count, 0);
    assert_eq!(shipping_rate_count, 0);

    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/health", None, None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
}
