mod common;

use std::collections::HashMap;

use axum::{
    Form, Json, Router,
    http::{Method, StatusCode},
    routing::post,
};
use serde_json::json;
use sqlx::PgPool;
use tokio::net::TcpListener;

/// Stub Cloudflare siteverify: "pass" succeeds, anything else fails. Returns the URL the app
/// under test is pointed at via `TurnstileConfig::resolve`. The real endpoint speaks
/// `application/x-www-form-urlencoded`, so the stub does too.
async fn stub_siteverify() -> String {
    let stub = Router::new().route(
        "/siteverify",
        post(|Form(body): Form<HashMap<String, String>>| async move {
            Json(json!({ "success": body.get("response").map(String::as_str) == Some("pass") }))
        }),
    );
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind stub");
    let url = format!("http://{}/siteverify", listener.local_addr().unwrap());
    tokio::spawn(async move {
        axum::serve(listener, stub).await.expect("stub server");
    });
    url
}

#[sqlx::test]
async fn protected_post_without_token_is_rejected(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "x", "password": "y" })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
    assert_eq!(body["code"], "TURNSTILE_REQUIRED");
}

#[sqlx::test]
async fn accepted_token_reaches_the_handler(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "ts-admin", "secret123").await;
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request_with_headers(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "ts-admin", "password": "secret123" })),
        &[("cf-turnstile-token", "pass".to_string())],
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body["token"].is_string(), "{body}");
}

#[sqlx::test]
async fn rejected_token_is_forbidden(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    let (status, body) = common::request_with_headers(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "x", "password": "y" })),
        &[("cf-turnstile-token", "bogus".to_string())],
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN, "{body}");
    assert_eq!(body["code"], "TURNSTILE_FAILED");
}

#[sqlx::test]
async fn non_post_on_shared_route_bypasses_verification(pool: PgPool) {
    let app = common::app_with_turnstile(pool, &stub_siteverify().await);

    // GET /api/support/messages shares a route with the protected POST; the middleware must
    // let it reach the handler, which answers 401 for missing support auth rather than 400.
    let (status, body) =
        common::request(app, Method::GET, "/api/support/messages", None, None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED, "{body}");
    assert_ne!(body["code"], "TURNSTILE_REQUIRED");
}
