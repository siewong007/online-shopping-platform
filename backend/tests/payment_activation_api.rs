mod common;

use axum::{
    Router,
    body::Body,
    http::{HeaderValue, Method, Request, StatusCode, header::AUTHORIZATION, header::CONTENT_TYPE},
};
use http_body_util::BodyExt;
use online_shopping_api::{
    app_state::AppState,
    modules::payments::activation::{ACTIVATION_HEADER, PaymentActivationMode},
    routes,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

fn app_in_mode(pool: PgPool, mode: PaymentActivationMode) -> Router {
    routes::build_router(
        AppState::with_payment_activation_mode(pool, mode),
        HeaderValue::from_static("http://localhost:5173"),
    )
}

/// Snapshot of everything a rejected initiation must leave untouched. A gateway request always
/// begins by inserting its payment row, so an unchanged payment count also proves that no
/// provider request was created.
struct Commerce {
    orders: i64,
    payments: i64,
    stock: i32,
}

async fn commerce(pool: &PgPool, product_id: i32) -> Commerce {
    Commerce {
        orders: sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM orders")
            .fetch_one(pool)
            .await
            .expect("order count"),
        payments: sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM payments")
            .fetch_one(pool)
            .await
            .expect("payment count"),
        stock: sqlx::query_scalar::<_, i32>("SELECT stock_quantity FROM products WHERE id = $1")
            .bind(product_id)
            .fetch_one(pool)
            .await
            .expect("stock"),
    }
}

async fn seed_product(pool: &PgPool) -> i32 {
    let product_id = sqlx::query_scalar::<_, i32>("SELECT id FROM products ORDER BY id LIMIT 1")
        .fetch_one(pool)
        .await
        .expect("seed product");
    sqlx::query("UPDATE products SET price_cents = 1000, stock_quantity = 7 WHERE id = $1")
        .bind(product_id)
        .execute(pool)
        .await
        .expect("set stock");
    product_id
}

fn checkout_body(product_id: i32) -> Value {
    json!({
        "customer_name": "Ordinary Shopper",
        "customer_email": "shopper@example.com",
        "customer_phone": "0123456789",
        "fulfillment_method": "pickup",
        "items": [{ "product_id": product_id, "quantity": 1 }]
    })
}

async fn start_payment(
    app: Router,
    product_id: i32,
    customer_token: Option<&str>,
    activation: Option<&str>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri("/api/checkout/payment")
        .header(CONTENT_TYPE, "application/json");
    if let Some(token) = customer_token {
        builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
    }
    if let Some(activation) = activation {
        builder = builder.header(ACTIVATION_HEADER, activation);
    }

    let response = app
        .oneshot(
            builder
                .body(Body::from(checkout_body(product_id).to_string()))
                .expect("request should build"),
        )
        .await
        .expect("router request should complete");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body should collect")
        .to_bytes();
    let text = String::from_utf8(bytes.to_vec()).expect("utf-8");
    (
        status,
        serde_json::from_str(&text).unwrap_or(Value::String(text)),
    )
}

async fn register_customer(app: Router) -> String {
    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "shopper@example.com",
            "password": "hunter2pass",
            "display_name": "Ordinary Shopper"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");
    body["token"].as_str().expect("token").to_string()
}

#[sqlx::test]
async fn controlled_mode_refuses_ordinary_customers_over_http_without_touching_commerce(
    pool: PgPool,
) {
    let product_id = seed_product(&pool).await;
    let before = commerce(&pool, product_id).await;
    let app = app_in_mode(pool.clone(), PaymentActivationMode::Controlled);
    let customer_token = register_customer(app.clone()).await;

    // A hand-built request, a signed-in shopper, a guessed secret and a header borrowed from the
    // session are all the same thing to the gate: no valid authorization.
    for (label, token, activation) in [
        ("anonymous, no header", None, None),
        ("signed-in shopper", Some(customer_token.as_str()), None),
        ("guessed secret", None, Some("activation")),
        (
            "invented 64-hex secret",
            None,
            Some("d1f45a90c3be27e6108a4b7c2d9e3f5081a6b4c7d2e9f30516a7b8c9d0e1f2a3"),
        ),
        (
            "session token replayed as activation",
            Some(customer_token.as_str()),
            Some(customer_token.as_str()),
        ),
    ] {
        let (status, body) = start_payment(app.clone(), product_id, token, activation).await;
        assert_eq!(
            status,
            StatusCode::SERVICE_UNAVAILABLE,
            "{label} must be refused: {body}"
        );
    }

    let after = commerce(&pool, product_id).await;
    assert_eq!(after.orders, before.orders, "no order may be created");
    assert_eq!(after.payments, before.payments, "no payment may be created");
    assert_eq!(after.stock, before.stock, "no stock may be held");
}

#[sqlx::test]
async fn disabled_mode_refuses_the_checkout_route_outright(pool: PgPool) {
    let product_id = seed_product(&pool).await;
    let before = commerce(&pool, product_id).await;
    let app = app_in_mode(pool.clone(), PaymentActivationMode::Disabled);

    let (status, body) = start_payment(app.clone(), product_id, None, None).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");

    let (status, body) = start_payment(app, product_id, None, Some("any-secret")).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");

    let after = commerce(&pool, product_id).await;
    assert_eq!(after.orders, before.orders);
    assert_eq!(after.payments, before.payments);
    assert_eq!(after.stock, before.stock);
}

#[sqlx::test]
async fn a_rejected_attempt_reveals_nothing_about_the_authorization_it_presented(pool: PgPool) {
    let product_id = seed_product(&pool).await;
    let app = app_in_mode(pool.clone(), PaymentActivationMode::Controlled);
    let admin_app = common::app(pool.clone());
    common::create_admin(&pool, "Super Admin", "activation-admin", "secret123").await;
    let admin_token = common::login(admin_app.clone(), "activation-admin", "secret123").await;

    let (status, issued) = common::request(
        admin_app,
        Method::POST,
        "/api/admin/payments/activation-grants",
        Some(&admin_token),
        Some(json!({ "label": "spent", "expires_in_minutes": 5 })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{issued}");
    let spent = issued["authorization"]
        .as_str()
        .expect("secret")
        .to_string();
    sqlx::query("UPDATE payment_activation_grants SET consumed_at = now()")
        .execute(&pool)
        .await
        .expect("mark spent");

    let (missing_status, missing_body) = start_payment(app.clone(), product_id, None, None).await;
    let (unknown_status, unknown_body) =
        start_payment(app.clone(), product_id, None, Some("not-an-authorization")).await;
    let (spent_status, spent_body) = start_payment(app, product_id, None, Some(&spent)).await;

    assert_eq!(missing_status, unknown_status);
    assert_eq!(unknown_status, spent_status);
    assert_eq!(
        missing_body, unknown_body,
        "a rejection must not say whether a secret was recognised"
    );
    assert_eq!(unknown_body, spent_body);
    assert!(
        !spent_body.to_string().contains(&spent),
        "a rejection must not echo the presented secret"
    );
}

#[sqlx::test]
async fn issuing_an_activation_authorization_is_restricted_to_the_super_admin(pool: PgPool) {
    let app = common::app(pool.clone());
    common::create_admin(&pool, "Super Admin", "super-issuer", "secret123").await;
    common::create_admin(&pool, "Store Manager", "store-manager", "secret123").await;
    common::create_admin(
        &pool,
        "Catalog Specialist",
        "catalog-specialist",
        "secret123",
    )
    .await;

    let (anonymous_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/payments/activation-grants",
        None,
        Some(json!({})),
    )
    .await;
    assert_eq!(anonymous_status, StatusCode::UNAUTHORIZED);

    // Store Manager holds `admin-payments` create rights, which is deliberately not enough.
    for username in ["store-manager", "catalog-specialist"] {
        let token = common::login(app.clone(), username, "secret123").await;
        let (status, body) = common::request(
            app.clone(),
            Method::POST,
            "/api/admin/payments/activation-grants",
            Some(&token),
            Some(json!({})),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN, "{username}: {body}");
    }

    let issued_before =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM payment_activation_grants")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(issued_before, 0, "a refused request must issue nothing");

    let super_token = common::login(app.clone(), "super-issuer", "secret123").await;
    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/admin/payments/activation-grants",
        Some(&super_token),
        Some(json!({ "label": "hitpay production UAT", "expires_in_minutes": 10 })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");

    let secret = body["authorization"].as_str().expect("authorization");
    assert_eq!(secret.len(), 64, "the secret is 32 random bytes");
    assert_eq!(body["label"], "hitpay production UAT");

    let stored_in_the_clear = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM payment_activation_grants WHERE token_sha256 = $1",
    )
    .bind(secret)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stored_in_the_clear, 0, "only the digest is stored");
}

#[sqlx::test]
async fn legacy_checkout_route_is_gated_in_disabled_and_controlled_modes(pool: PgPool) {
    let product_id = seed_product(&pool).await;
    let before = commerce(&pool, product_id).await;

    for mode in [
        PaymentActivationMode::Disabled,
        PaymentActivationMode::Controlled,
    ] {
        let app = app_in_mode(pool.clone(), mode);
        let (status, body) = common::request(
            app,
            Method::POST,
            "/api/checkout",
            None,
            Some(checkout_body(product_id)),
        )
        .await;
        assert_eq!(
            status,
            StatusCode::SERVICE_UNAVAILABLE,
            "{mode:?} must refuse the legacy checkout route: {body}"
        );
        let after = commerce(&pool, product_id).await;
        assert_eq!(
            after.orders, before.orders,
            "{mode:?} must not create an order"
        );
        assert_eq!(
            after.payments, before.payments,
            "{mode:?} must not create a payment"
        );
        assert_eq!(after.stock, before.stock, "{mode:?} must not hold stock");
    }

    // `public` mode keeps the historical local-development behavior so long as APP_ENV is not
    // set to production.
    let app = app_in_mode(pool.clone(), PaymentActivationMode::Public);
    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/checkout",
        None,
        Some(checkout_body(product_id)),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");
    let after = commerce(&pool, product_id).await;
    assert_eq!(
        after.orders,
        before.orders + 1,
        "public mode allows the legacy route"
    );
    assert_eq!(
        after.stock,
        before.stock - 1,
        "public mode legacy checkout holds stock"
    );
}
