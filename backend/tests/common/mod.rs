#![allow(dead_code)]

use axum::{
    Router,
    body::Body,
    http::{HeaderValue, Method, Request, StatusCode, header::AUTHORIZATION, header::CONTENT_TYPE},
};
use home_depot_clone_api::{app_state::AppState, db, routes, security::hash_password};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

pub fn app(pool: PgPool) -> Router {
    routes::build_router(
        AppState::new(pool),
        HeaderValue::from_static("http://localhost:5173"),
    )
}

pub async fn create_admin(pool: &PgPool, role_name: &str, username: &str, password: &str) {
    let role_id = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM roles
        WHERE name = $1
        "#,
    )
    .bind(role_name)
    .fetch_one(pool)
    .await
    .expect("role should exist");
    let password_hash = hash_password(password).expect("password should hash");

    db::create_admin_user(pool, username, username, &password_hash, role_id)
        .await
        .expect("admin user should be created");
}

pub async fn login(app: Router, username: &str, password: &str) -> String {
    let (status, body) = request(
        app,
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": username, "password": password })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    body["token"]
        .as_str()
        .expect("login response should include token")
        .to_string()
}

pub async fn request(
    app: Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(path);

    if let Some(token) = token {
        builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
    }

    let body = if let Some(body) = body {
        builder = builder.header(CONTENT_TYPE, "application/json");
        Body::from(body.to_string())
    } else {
        Body::empty()
    };

    let response = app
        .oneshot(builder.body(body).expect("request should build"))
        .await
        .expect("router request should complete");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("response body should collect")
        .to_bytes();

    if bytes.is_empty() {
        return (status, Value::Null);
    }

    let text = String::from_utf8(bytes.to_vec()).expect("response should be utf-8");
    let value = serde_json::from_str(&text).unwrap_or(Value::String(text));

    (status, value)
}
