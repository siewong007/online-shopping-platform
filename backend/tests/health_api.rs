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
