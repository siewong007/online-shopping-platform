mod common;

use axum::http::{Method, StatusCode};
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn register_login_and_me_roundtrip(pool: PgPool) {
    let app = common::app(pool);

    let (register_status, register_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "shopper@example.com",
            "password": "hunter2pass",
            "display_name": "Shopper Jones"
        })),
    )
    .await;
    assert_eq!(register_status, StatusCode::CREATED, "{register_body}");
    let token = register_body["token"]
        .as_str()
        .expect("register response should include token")
        .to_string();
    assert_eq!(register_body["account"]["email"], "shopper@example.com");

    let (login_status, login_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/login",
        None,
        Some(json!({ "email": "shopper@example.com", "password": "hunter2pass" })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK, "{login_body}");

    let (me_status, me_body) =
        common::request(app, Method::GET, "/api/account/me", Some(&token), None).await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    assert_eq!(me_body["account"]["email"], "shopper@example.com");
    assert_eq!(me_body["account"]["display_name"], "Shopper Jones");
}

#[sqlx::test]
async fn duplicate_registration_and_bad_login_are_generic(pool: PgPool) {
    let app = common::app(pool);

    let (first_status, first_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "dupe@example.com",
            "password": "hunter2pass",
            "display_name": "Dupe One"
        })),
    )
    .await;
    assert_eq!(first_status, StatusCode::CREATED, "{first_body}");

    let (second_status, second_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "DUPE@example.com",
            "password": "anotherpass1",
            "display_name": "Dupe Two"
        })),
    )
    .await;
    assert_eq!(second_status, StatusCode::BAD_REQUEST, "{second_body}");

    let (short_password_status, short_password_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "short@example.com",
            "password": "short1",
            "display_name": "Short Pass"
        })),
    )
    .await;
    assert_eq!(
        short_password_status,
        StatusCode::BAD_REQUEST,
        "{short_password_body}"
    );

    let (bad_login_status, bad_login_body) = common::request(
        app,
        Method::POST,
        "/api/account/login",
        None,
        Some(json!({ "email": "dupe@example.com", "password": "wrong-password" })),
    )
    .await;
    assert_eq!(
        bad_login_status,
        StatusCode::UNAUTHORIZED,
        "{bad_login_body}"
    );
}

#[sqlx::test]
async fn customer_token_cannot_access_admin_routes(pool: PgPool) {
    let app = common::app(pool);

    let (register_status, register_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "boundary@example.com",
            "password": "hunter2pass",
            "display_name": "Boundary Tester"
        })),
    )
    .await;
    assert_eq!(register_status, StatusCode::CREATED, "{register_body}");
    let customer_token = register_body["token"].as_str().expect("token").to_string();

    let (admin_status, _) = common::request(
        app,
        Method::GET,
        "/api/admin/settings",
        Some(&customer_token),
        None,
    )
    .await;
    assert_eq!(admin_status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
async fn checkout_while_signed_in_links_account_and_awards_points(pool: PgPool) {
    let app = common::app(pool);

    let (register_status, register_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "points@example.com",
            "password": "hunter2pass",
            "display_name": "Points Earner"
        })),
    )
    .await;
    assert_eq!(register_status, StatusCode::CREATED, "{register_body}");
    let token = register_body["token"].as_str().expect("token").to_string();

    let (checkout_status, checkout_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        Some(&token),
        Some(json!({
            "customer_name": "Points Earner",
            "customer_email": "points@example.com",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(checkout_status, StatusCode::CREATED, "{checkout_body}");

    let (me_status, me_body) =
        common::request(app, Method::GET, "/api/account/me", Some(&token), None).await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    assert_eq!(me_body["orders"].as_array().map(Vec::len), Some(1));
    assert!(
        me_body["profile"]["points_balance"]
            .as_i64()
            .is_some_and(|points| points > 0)
    );
}

#[sqlx::test]
async fn transactions_do_not_match_unverified_email_claims(pool: PgPool) {
    let app = common::app(pool.clone());

    let (checkout_status, checkout_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Victim Buyer",
            "customer_email": "victim-transactions@example.com",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(checkout_status, StatusCode::CREATED, "{checkout_body}");
    let victim_order_id = checkout_body["id"].as_i64().expect("order id") as i32;

    sqlx::query(
        r#"
        INSERT INTO payments
            (order_id, idempotency_key, amount_cents, method, status, reference, notes, processed_at)
        VALUES
            ($1, 'victim-payment-reference', 1000, 'Card', 'Captured', 'card-ref-4242', '', now())
        "#,
    )
    .bind(victim_order_id)
    .execute(&pool)
    .await
    .expect("victim payment should be created");

    let (register_status, register_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/account/register",
        None,
        Some(json!({
            "email": "victim-transactions@example.com",
            "password": "hunter2pass",
            "display_name": "Email Claimer"
        })),
    )
    .await;
    assert_eq!(register_status, StatusCode::CREATED, "{register_body}");
    let attacker_token = register_body["token"].as_str().expect("token").to_string();

    let (transactions_status, transactions_body) = common::request(
        app,
        Method::GET,
        "/api/customer-portal/me/transactions",
        Some(&attacker_token),
        None,
    )
    .await;
    assert_eq!(transactions_status, StatusCode::OK, "{transactions_body}");
    assert_eq!(transactions_body["total"], 0);
    assert_eq!(
        transactions_body["transactions"].as_array().map(Vec::len),
        Some(0)
    );
}
