mod common;

use axum::{
    Router,
    http::{Method, StatusCode},
};
use serde_json::{Value, json};
use sqlx::PgPool;

async fn create_checkout_order(
    app: &Router,
    customer_name: &str,
    customer_email: &str,
    product_id: i32,
) -> i64 {
    let (status, body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": customer_name,
            "customer_email": customer_email,
            "items": [{ "product_id": product_id, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");
    body["id"].as_i64().expect("order id")
}

async fn lookup_customer(app: &Router, email: &str, token: Option<&str>) -> (StatusCode, Value) {
    common::request(
        app.clone(),
        Method::GET,
        &format!("/api/customer-portal/lookup?email={email}"),
        token,
        None,
    )
    .await
}

#[sqlx::test]
async fn login_returns_token_bad_password_fails_and_me_reports_role(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "auth-admin", "secret123").await;
    let app = common::app(pool);

    let (bad_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/login",
        None,
        Some(json!({ "username": "auth-admin", "password": "wrong" })),
    )
    .await;
    assert_eq!(bad_status, StatusCode::UNAUTHORIZED);

    let token = common::login(app.clone(), "auth-admin", "secret123").await;
    assert_eq!(token.len(), 64);

    let (me_status, me_body) =
        common::request(app, Method::GET, "/api/admin/me", Some(&token), None).await;
    assert_eq!(me_status, StatusCode::OK, "{me_body}");
    assert_eq!(me_body["role"]["name"], "Super Admin");
    assert_eq!(me_body["user"]["username"], "auth-admin");
}

#[sqlx::test]
async fn settings_read_requires_token_and_permission(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "settings-admin", "secret123").await;
    common::create_admin(
        &pool,
        "Fulfillment Lead",
        "settings-fulfillment",
        "secret123",
    )
    .await;
    let app = common::app(pool);

    let (missing_status, _) =
        common::request(app.clone(), Method::GET, "/api/admin/settings", None, None).await;
    assert_eq!(missing_status, StatusCode::UNAUTHORIZED);

    let fulfillment_token = common::login(app.clone(), "settings-fulfillment", "secret123").await;
    let (forbidden_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/settings",
        Some(&fulfillment_token),
        None,
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);

    let super_token = common::login(app.clone(), "settings-admin", "secret123").await;
    let (ok_status, ok_body) = common::request(
        app,
        Method::GET,
        "/api/admin/settings",
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(ok_status, StatusCode::OK, "{ok_body}");
    assert!(
        ok_body
            .as_array()
            .is_some_and(|settings| !settings.is_empty())
    );
}

#[sqlx::test]
async fn catalog_mutation_respects_create_permission(pool: PgPool) {
    common::create_admin(
        &pool,
        "Catalog Specialist",
        "catalog-specialist",
        "secret123",
    )
    .await;
    common::create_admin(
        &pool,
        "Fulfillment Lead",
        "catalog-fulfillment",
        "secret123",
    )
    .await;
    let app = common::app(pool);
    let specialist_token = common::login(app.clone(), "catalog-specialist", "secret123").await;
    let fulfillment_token = common::login(app.clone(), "catalog-fulfillment", "secret123").await;
    let product = json!({
        "name": "Test Wire Stripper",
        "category_slug": "tools",
        "price_cents": 1299,
        "badge": "Test",
        "description": "A test product for permission coverage.",
        "tone": "Test",
        "featured": false
    });

    let (created_status, created_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&specialist_token),
        Some(product.clone()),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED, "{created_body}");

    let (forbidden_status, _) = common::request(
        app,
        Method::POST,
        "/api/admin/products",
        Some(&fulfillment_token),
        Some(product),
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);
}

#[sqlx::test]
async fn catalog_crud_roundtrip_blocks_category_delete_with_products(pool: PgPool) {
    common::create_admin(&pool, "Catalog Specialist", "catalog-crud", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "catalog-crud", "secret123").await;

    let (catalog_status, catalog_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/catalog",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(catalog_status, StatusCode::OK, "{catalog_body}");
    assert!(
        catalog_body["products"]
            .as_array()
            .is_some_and(|products| !products.is_empty())
    );

    let (category_status, category_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/categories",
        Some(&token),
        Some(json!({
            "slug": "electrical-test",
            "name": "Electrical Test",
            "teaser": "Electrical supplies for test coverage."
        })),
    )
    .await;
    assert_eq!(category_status, StatusCode::CREATED, "{category_body}");

    let (product_status, product_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&token),
        Some(json!({
            "name": "Temporary Switch Box",
            "category_slug": "electrical-test",
            "price_cents": 2199,
            "badge": "Test",
            "description": "Temporary catalog product for CRUD coverage.",
            "tone": "Electrical",
            "featured": true
        })),
    )
    .await;
    assert_eq!(product_status, StatusCode::CREATED, "{product_body}");
    let product_id = product_body["id"].as_i64().expect("product id") as i32;

    let (update_status, update_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/categories/electrical-test",
        Some(&token),
        Some(json!({
            "name": "Electrical Updated",
            "teaser": "Updated electrical supplies."
        })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{update_body}");
    assert_eq!(update_body["name"], "Electrical Updated");

    let (blocked_status, blocked_body) = common::request(
        app.clone(),
        Method::DELETE,
        "/api/admin/categories/electrical-test",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(blocked_status, StatusCode::BAD_REQUEST);
    assert!(
        blocked_body
            .as_str()
            .is_some_and(|message| message.contains("Reassign 1 product"))
    );

    let (delete_product_status, _) = common::request(
        app.clone(),
        Method::DELETE,
        &format!("/api/admin/products/{product_id}"),
        Some(&token),
        None,
    )
    .await;
    assert_eq!(delete_product_status, StatusCode::NO_CONTENT);

    let (delete_category_status, _) = common::request(
        app,
        Method::DELETE,
        "/api/admin/categories/electrical-test",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(delete_category_status, StatusCode::NO_CONTENT);
}

#[sqlx::test]
async fn invoice_from_order_uses_invoice_prefix_and_sequence(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "invoice-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "invoice-admin", "secret123").await;

    let (order_status, order_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Invoice Buyer",
            "customer_email": "invoice-buyer@example.com",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(order_status, StatusCode::CREATED, "{order_body}");
    let order_id = order_body["id"].as_i64().expect("order id");

    let (invoice_status, invoice_body) = common::request(
        app,
        Method::POST,
        &format!("/api/admin/invoices/from-order/{order_id}"),
        Some(&token),
        Some(json!({ "discount_cents": 0 })),
    )
    .await;
    assert_eq!(invoice_status, StatusCode::CREATED, "{invoice_body}");
    assert!(
        invoice_body["invoice_number"]
            .as_str()
            .is_some_and(|number| number.starts_with("INV-"))
    );
}

#[sqlx::test]
async fn fulfillment_status_flow_writes_history_and_advances_sales(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "fulfillment-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "fulfillment-admin", "secret123").await;

    let (order_status, order_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Fulfillment Buyer",
            "customer_email": "fulfillment-buyer@example.com",
            "fulfillment_method": "delivery",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(order_status, StatusCode::CREATED, "{order_body}");
    assert_eq!(order_body["fulfillment_method"], "delivery");
    assert_eq!(order_body["fulfillment_status"], "received");
    let order_id = order_body["id"].as_i64().expect("order id");

    let (skip_status, skip_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "delivered", "note": "skip" })),
    )
    .await;
    assert_eq!(skip_status, StatusCode::BAD_REQUEST);
    assert!(
        skip_body
            .as_str()
            .is_some_and(|message| message.contains("Cannot move from received to delivered."))
    );

    for status in ["picking", "packed", "out_for_delivery", "delivered"] {
        let (move_status, move_body) = common::request(
            app.clone(),
            Method::PUT,
            &format!("/api/admin/orders/{order_id}/fulfillment"),
            Some(&token),
            Some(json!({ "to_status": status, "note": format!("move to {status}") })),
        )
        .await;
        assert_eq!(move_status, StatusCode::OK, "{move_body}");
        assert_eq!(move_body["fulfillment_status"], status);
    }

    let history_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM order_fulfillment_history
        WHERE order_id = $1 AND changed_by = 'fulfillment-admin'
        "#,
    )
    .bind(order_id as i32)
    .fetch_one(&pool)
    .await
    .expect("history count should load");
    assert_eq!(history_count, 4);

    let sales_status = sqlx::query_as::<_, (String, String)>(
        r#"
        SELECT status, payment_status
        FROM order_sales_meta
        WHERE order_id = $1
        "#,
    )
    .bind(order_id as i32)
    .fetch_one(&pool)
    .await
    .expect("sales meta should load");
    assert_eq!(sales_status, ("fulfilled".to_string(), "paid".to_string()));

    let (terminal_status, _) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "canceled", "note": "too late" })),
    )
    .await;
    assert_eq!(terminal_status, StatusCode::BAD_REQUEST);

    let (cancel_order_status, cancel_order_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Canceled Buyer",
            "customer_email": "canceled-buyer@example.com",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(
        cancel_order_status,
        StatusCode::CREATED,
        "{cancel_order_body}"
    );
    let cancel_order_id = cancel_order_body["id"].as_i64().expect("order id");

    let (cancel_status, cancel_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{cancel_order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "canceled", "note": "customer requested" })),
    )
    .await;
    assert_eq!(cancel_status, StatusCode::OK, "{cancel_body}");

    let (canceled_terminal_status, _) = common::request(
        app,
        Method::PUT,
        &format!("/api/admin/orders/{cancel_order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "picking", "note": "resume" })),
    )
    .await;
    assert_eq!(canceled_terminal_status, StatusCode::BAD_REQUEST);
}

#[sqlx::test]
async fn public_customer_lookup_scopes_orders_by_email_case_insensitively(pool: PgPool) {
    let app = common::app(pool);

    let matching_order_id =
        create_checkout_order(&app, "Case Buyer", "CaseCustomer@example.com", 1).await;
    let other_order_id =
        create_checkout_order(&app, "Other Buyer", "other-buyer@example.com", 2).await;

    let (lookup_status, lookup_body) =
        lookup_customer(&app, "casecustomer@example.com", None).await;
    assert_eq!(lookup_status, StatusCode::OK, "{lookup_body}");
    assert_eq!(
        lookup_body["profile"]["customer_email"],
        "casecustomer@example.com"
    );
    assert_eq!(lookup_body["profile"]["membership_tier"], "Bronze");

    let orders = lookup_body["orders"]
        .as_array()
        .expect("orders should be an array");
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0]["id"], matching_order_id);
    assert_ne!(orders[0]["id"], other_order_id);
    assert_eq!(orders[0]["fulfillment_status"], "received");
    assert!(orders[0]["customer_name"].is_null());
    assert!(orders[0]["customer_email"].is_null());
    assert!(orders[0]["fulfillment_history"].is_null());
    assert_eq!(
        orders[0]["items"][0]["product_name"],
        "Milwaukee M18 9-Tool Combo Kit"
    );
    assert!(orders[0]["items"][0]["product_id"].is_null());
}

#[sqlx::test]
async fn public_customer_lookup_rejects_missing_blank_and_invalid_email(pool: PgPool) {
    let app = common::app(pool);

    let (missing_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/customer-portal/lookup",
        None,
        None,
    )
    .await;
    assert_eq!(missing_status, StatusCode::BAD_REQUEST);

    let (blank_status, blank_body) = lookup_customer(&app, "%20%20", None).await;
    assert_eq!(blank_status, StatusCode::BAD_REQUEST);
    assert_eq!(blank_body, "Email is required.");

    let (invalid_status, invalid_body) = lookup_customer(&app, "not-an-email", None).await;
    assert_eq!(invalid_status, StatusCode::BAD_REQUEST);
    assert_eq!(invalid_body, "Email must be a valid address.");
}

#[sqlx::test]
async fn public_customer_lookup_returns_empty_payload_for_unknown_email(pool: PgPool) {
    let app = common::app(pool);

    let (status, body) = lookup_customer(&app, "missing-customer@example.com", None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body["profile"].is_null());
    assert_eq!(body["orders"].as_array().expect("orders array").len(), 0);
}

#[sqlx::test]
async fn public_customer_lookup_supports_profile_only_customers(pool: PgPool) {
    let app = common::app(pool.clone());

    sqlx::query(
        r#"
        INSERT INTO customer_portal_profiles
            (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders)
        VALUES ('Profile Only', 'profile-only@example.com', 'Gold', 250, 25000, 0)
        "#,
    )
    .execute(&pool)
    .await
    .expect("profile should insert");

    let (status, body) = lookup_customer(&app, "profile-only@example.com", None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["profile"]["customer_name"], "Profile Only");
    assert_eq!(body["profile"]["membership_tier"], "Gold");
    assert_eq!(body["profile"]["points_balance"], 250);
    assert_eq!(body["orders"].as_array().expect("orders array").len(), 0);
}

#[sqlx::test]
async fn public_customer_lookup_supports_order_without_profile(pool: PgPool) {
    let app = common::app(pool.clone());
    let order_id = create_checkout_order(&app, "Order Only", "order-only@example.com", 1).await;

    sqlx::query(
        r#"
        DELETE FROM customer_portal_profiles
        WHERE customer_email = 'order-only@example.com'
        "#,
    )
    .execute(&pool)
    .await
    .expect("profile should delete");

    let (status, body) = lookup_customer(&app, "order-only@example.com", None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body["profile"].is_null());

    let orders = body["orders"].as_array().expect("orders array");
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0]["id"], order_id);
}

#[sqlx::test]
async fn public_customer_lookup_caps_orders_at_twenty_newest_first(pool: PgPool) {
    let app = common::app(pool);
    let mut created_order_ids = Vec::new();

    for index in 0..22 {
        let order_id = create_checkout_order(
            &app,
            "Limit Buyer",
            "limit-buyer@example.com",
            if index % 2 == 0 { 1 } else { 2 },
        )
        .await;
        created_order_ids.push(order_id);
    }

    let (status, body) = lookup_customer(&app, "limit-buyer@example.com", None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["profile"]["total_orders"], 22);

    let orders = body["orders"].as_array().expect("orders array");
    assert_eq!(orders.len(), 20);

    let returned_ids = orders
        .iter()
        .map(|order| order["id"].as_i64().expect("order id"))
        .collect::<Vec<_>>();
    let expected_ids = created_order_ids
        .iter()
        .rev()
        .take(20)
        .copied()
        .collect::<Vec<_>>();

    assert_eq!(returned_ids, expected_ids);
    assert!(!returned_ids.contains(&created_order_ids[0]));
    assert!(!returned_ids.contains(&created_order_ids[1]));
}

#[sqlx::test]
async fn public_customer_lookup_ignores_admin_token_for_scope(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "lookup-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "lookup-admin", "secret123").await;

    let requested_order_id =
        create_checkout_order(&app, "Requested Buyer", "requested@example.com", 1).await;
    let other_order_id =
        create_checkout_order(&app, "Private Buyer", "private@example.com", 2).await;

    let (status, body) = lookup_customer(&app, "requested@example.com", Some(&token)).await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let orders = body["orders"].as_array().expect("orders array");
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0]["id"], requested_order_id);
    assert_ne!(orders[0]["id"], other_order_id);
}

#[sqlx::test]
async fn settings_update_roundtrip(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "settings-update", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "settings-update", "secret123").await;

    let (update_status, update_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/settings/general.company_name",
        Some(&token),
        Some(json!({ "value": "Project Depot Test" })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{update_body}");
    assert_eq!(update_body["value"], "Project Depot Test");

    let (read_status, read_body) =
        common::request(app, Method::GET, "/api/admin/settings", Some(&token), None).await;
    assert_eq!(read_status, StatusCode::OK, "{read_body}");

    let setting = read_body
        .as_array()
        .and_then(|settings| {
            settings
                .iter()
                .find(|setting| setting["key"] == "general.company_name")
        })
        .expect("updated setting should be present");
    assert_eq!(setting["value"], "Project Depot Test");
}
