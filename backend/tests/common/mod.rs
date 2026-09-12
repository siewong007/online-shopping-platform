#![allow(dead_code)]

use axum::{
    Router,
    body::Body,
    http::{HeaderValue, Method, Request, StatusCode, header::AUTHORIZATION, header::CONTENT_TYPE},
};
use http_body_util::BodyExt;
use online_shopping_api::{
    app_state::AppState,
    db,
    modules::{mfa::service::MfaConfig, payments::activation::PaymentActivationMode},
    routes,
    security::hash_password,
    turnstile::TurnstileConfig,
};

pub const TEST_MFA_KEY: [u8; 32] = [42_u8; 32];
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

pub fn app(pool: PgPool) -> Router {
    // General integration tests exercise normal app behavior including the legacy checkout route,
    // which only runs in `public` mode. Mode-specific behavior is tested explicitly via
    // `with_payment_activation_mode` in the payment activation suites.
    routes::build_router(
        AppState::with_payment_activation_mode(pool, PaymentActivationMode::Public),
        HeaderValue::from_static("http://localhost:5173"),
    )
}

/// App state with multi-factor authentication enabled under a deterministic test key.
pub fn app_with_mfa(pool: PgPool) -> Router {
    routes::build_router(
        AppState::with_payment_activation_mode(pool, PaymentActivationMode::Public)
            .with_mfa(MfaConfig::from_raw_key(TEST_MFA_KEY)),
        HeaderValue::from_static("http://localhost:5173"),
    )
}

/// App state with Turnstile verification pointed at a stub siteverify server.
pub fn app_with_turnstile(pool: PgPool, siteverify_url: &str) -> Router {
    routes::build_router(
        AppState::with_payment_activation_mode(pool, PaymentActivationMode::Public).with_turnstile(
            TurnstileConfig::resolve(Some("test-secret"), Some(siteverify_url)),
        ),
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
    request_with_headers(app, method, path, token, body, &[]).await
}

pub async fn request_with_headers(
    app: Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    body: Option<Value>,
    extra_headers: &[(&'static str, String)],
) -> (StatusCode, Value) {
    // Handlers behind `ConnectInfo` extraction (client-IP throttling) need the extension the
    // real server injects; oneshot requests bypass that make-service layer.
    let mut builder =
        Request::builder()
            .method(method)
            .uri(path)
            .extension(axum::extract::ConnectInfo(std::net::SocketAddr::from((
                [127, 0, 0, 1],
                41_042,
            ))));

    if let Some(token) = token {
        builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
    }

    for (name, value) in extra_headers {
        builder = builder.header(*name, value.clone());
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

pub async fn request_text(
    app: Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    content_type: &'static str,
    body: &str,
) -> (StatusCode, Value) {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header(CONTENT_TYPE, content_type);
    if let Some(token) = token {
        builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
    }

    let response = app
        .oneshot(
            builder
                .body(Body::from(body.to_string()))
                .expect("request should build"),
        )
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
