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

async fn lookup_customer(
    app: &Router,
    email: &str,
    order_id: i64,
    token: Option<&str>,
) -> (StatusCode, Value) {
    common::request(
        app.clone(),
        Method::GET,
        &format!("/api/customer-portal/lookup?email={email}&order_id={order_id}"),
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
        "featured": false,
        "stock_quantity": 10,
        "low_stock_threshold": 5
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
            "featured": true,
            "stock_quantity": 5,
            "low_stock_threshold": 3
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
async fn product_image_url_scheme_is_validated_and_roundtrips(pool: PgPool) {
    common::create_admin(&pool, "Catalog Specialist", "catalog-image", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "catalog-image", "secret123").await;

    let base_product = json!({
        "name": "Test Wire Stripper",
        "category_slug": "tools",
        "price_cents": 1299,
        "badge": "Test",
        "description": "A test product for image URL coverage.",
        "tone": "Test",
        "featured": false,
        "stock_quantity": 10,
        "low_stock_threshold": 5
    });

    let mut javascript_scheme = base_product.clone();
    javascript_scheme["image_url"] = json!("javascript:alert('xss')");
    let (javascript_status, javascript_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&token),
        Some(javascript_scheme),
    )
    .await;
    assert_eq!(
        javascript_status,
        StatusCode::BAD_REQUEST,
        "{javascript_body}"
    );

    let mut data_scheme = base_product.clone();
    data_scheme["image_url"] = json!("data:image/png;base64,aGVsbG8=");
    let (data_status, data_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&token),
        Some(data_scheme),
    )
    .await;
    assert_eq!(data_status, StatusCode::CREATED, "{data_body}");
    assert_eq!(data_body["image_url"], "data:image/png;base64,aGVsbG8=");

    let mut unsupported_data_scheme = base_product.clone();
    unsupported_data_scheme["image_url"] = json!("data:text/html;base64,PHNjcmlwdD4=");
    let (unsupported_data_status, unsupported_data_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&token),
        Some(unsupported_data_scheme),
    )
    .await;
    assert_eq!(
        unsupported_data_status,
        StatusCode::BAD_REQUEST,
        "{unsupported_data_body}"
    );

    let mut valid_url = base_product.clone();
    valid_url["image_url"] = json!("https://example.com/wire-stripper.jpg");
    let (created_status, created_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/products",
        Some(&token),
        Some(valid_url),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED, "{created_body}");
    assert_eq!(
        created_body["image_url"],
        "https://example.com/wire-stripper.jpg"
    );
    let product_id = created_body["id"].as_i64().expect("product id") as i32;

    let (empty_status, empty_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/products/{product_id}"),
        Some(&token),
        Some(base_product.clone()),
    )
    .await;
    assert_eq!(empty_status, StatusCode::OK, "{empty_body}");
    assert_eq!(empty_body["image_url"], "");

    let (catalog_status, catalog_body) =
        common::request(app, Method::GET, "/api/admin/catalog", Some(&token), None).await;
    assert_eq!(catalog_status, StatusCode::OK, "{catalog_body}");
    assert!(catalog_body["products"].as_array().is_some_and(|products| {
        products
            .iter()
            .any(|product| product["id"] == product_id && product["image_url"] == "")
    }));
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
async fn invoice_billing_validation_hardens_einvoice_fields(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "invoice-billing-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "invoice-billing-admin", "secret123").await;

    let order_id = create_checkout_order(&app, "Tax Ready Buyer", "tax-ready@example.com", 1).await;

    let (invoice_status, invoice_body) = common::request(
        app.clone(),
        Method::POST,
        &format!("/api/admin/invoices/from-order/{order_id}"),
        Some(&token),
        Some(json!({ "discount_cents": 0 })),
    )
    .await;
    assert_eq!(invoice_status, StatusCode::CREATED, "{invoice_body}");
    let invoice_id = invoice_body["id"].as_i64().expect("invoice id");

    let (missing_address_status, missing_address_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/invoices/{invoice_id}"),
        Some(&token),
        Some(json!({
            "billing_address": " ",
            "buyer_tin": "IG1234567890",
            "buyer_registration_number": null,
            "buyer_sst_registration_number": null
        })),
    )
    .await;
    assert_eq!(
        missing_address_status,
        StatusCode::BAD_REQUEST,
        "{missing_address_body}"
    );

    let (bad_tin_status, bad_tin_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/invoices/{invoice_id}"),
        Some(&token),
        Some(json!({
            "billing_address": "42 Jalan Test",
            "buyer_tin": "TIN WITH SPACE",
            "buyer_registration_number": null,
            "buyer_sst_registration_number": null
        })),
    )
    .await;
    assert_eq!(bad_tin_status, StatusCode::BAD_REQUEST, "{bad_tin_body}");

    let (ok_status, ok_body) = common::request(
        app,
        Method::PUT,
        &format!("/api/admin/invoices/{invoice_id}"),
        Some(&token),
        Some(json!({
            "billing_address": "  42 Jalan Test  ",
            "buyer_tin": "  IG1234567890  ",
            "buyer_registration_number": "  202401010001  ",
            "buyer_sst_registration_number": "  W10-1808-31001441  "
        })),
    )
    .await;
    assert_eq!(ok_status, StatusCode::OK, "{ok_body}");
    assert_eq!(ok_body["billing_address"], "42 Jalan Test");
    assert_eq!(ok_body["buyer_tin"], "IG1234567890");
    assert_eq!(ok_body["buyer_registration_number"], "202401010001");
    assert_eq!(
        ok_body["buyer_sst_registration_number"],
        "W10-1808-31001441"
    );
}

#[sqlx::test]
async fn autocount_export_downloads_csv_and_marks_invoices(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "autocount-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "autocount-admin", "secret123").await;

    let order_id =
        create_checkout_order(&app, "AutoCount Buyer", "autocount-buyer@example.com", 1).await;

    let (invoice_status, invoice_body) = common::request(
        app.clone(),
        Method::POST,
        &format!("/api/admin/invoices/from-order/{order_id}"),
        Some(&token),
        Some(json!({ "discount_cents": 0 })),
    )
    .await;
    assert_eq!(invoice_status, StatusCode::CREATED, "{invoice_body}");
    let invoice_number = invoice_body["invoice_number"]
        .as_str()
        .expect("invoice number")
        .to_string();

    let (export_status, export_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/invoices/autocount-export",
        Some(&token),
        Some(json!({})),
    )
    .await;
    assert_eq!(export_status, StatusCode::OK, "{export_body}");
    let csv = export_body.as_str().expect("csv body");
    assert!(csv.contains("DocumentNo,DocumentDate,DebtorCode"));
    assert!(csv.contains(&invoice_number));
    assert!(csv.contains("AutoCount Buyer"));
    assert!(csv.contains("SKU-1"));

    let (list_status, list_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/invoices",
        Some(&token),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK, "{list_body}");
    let exported_at = list_body["items"][0]["exported_to_autocount_at"]
        .as_str()
        .expect("export timestamp");
    assert!(!exported_at.is_empty());

    let (second_status, second_body) = common::request(
        app,
        Method::POST,
        "/api/admin/invoices/autocount-export",
        Some(&token),
        Some(json!({})),
    )
    .await;
    assert_eq!(second_status, StatusCode::BAD_REQUEST, "{second_body}");
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
            "shipping_address": {
                "recipient_name": "Fulfillment Buyer",
                "phone": "017-4050100",
                "address_line1": "100 Jalan Main",
                "city": "Sibu",
                "state": "Sarawak",
                "postal_code": "96000",
                "country_code": "MY"
            },
            "shipping_service_code": "standard",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(order_status, StatusCode::CREATED, "{order_body}");
    assert_eq!(order_body["fulfillment_method"], "delivery");
    assert_eq!(order_body["fulfillment_status"], "received");
    assert_eq!(order_body["shipping_cents"], 798);
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
    assert_eq!(
        sales_status,
        ("fulfilled".to_string(), "unpaid".to_string())
    );

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

    let cancel_sales_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT status
        FROM order_sales_meta
        WHERE order_id = $1
        "#,
    )
    .bind(cancel_order_id as i32)
    .fetch_one(&pool)
    .await
    .expect("sales meta should load");
    assert_eq!(cancel_sales_status, "cancelled");

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
async fn pickup_fulfillment_flow_completes_and_rejects_delivery_only_status(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "pickup-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "pickup-admin", "secret123").await;

    let (order_status, order_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Pickup Buyer",
            "customer_email": "pickup-buyer@example.com",
            "fulfillment_method": "pickup",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(order_status, StatusCode::CREATED, "{order_body}");
    assert_eq!(order_body["fulfillment_method"], "pickup");
    let order_id = order_body["id"].as_i64().expect("order id");

    let (mismatch_status, mismatch_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "out_for_delivery", "note": "wrong lane" })),
    )
    .await;
    assert_eq!(mismatch_status, StatusCode::BAD_REQUEST, "{mismatch_body}");

    for status in ["picking", "packed", "ready_for_pickup", "completed"] {
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
    assert_eq!(
        sales_status,
        ("fulfilled".to_string(), "unpaid".to_string())
    );
}

#[sqlx::test]
async fn canceled_order_can_no_longer_be_edited(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "edit-guard-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "edit-guard-admin", "secret123").await;

    let order_id =
        create_checkout_order(&app, "Edit Guard Buyer", "edit-guard@example.com", 1).await;

    let (cancel_status, cancel_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "canceled", "note": "changed mind" })),
    )
    .await;
    assert_eq!(cancel_status, StatusCode::OK, "{cancel_body}");

    let (edit_status, edit_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}"),
        Some(&token),
        Some(json!({
            "customer_name": "Renamed Buyer",
            "customer_email": "edit-guard@example.com",
            "items": [{ "product_id": 1, "quantity": 2 }]
        })),
    )
    .await;
    assert_eq!(edit_status, StatusCode::BAD_REQUEST, "{edit_body}");
    assert!(
        edit_body
            .as_str()
            .is_some_and(|message| message.contains("can no longer be edited"))
    );
}

#[sqlx::test]
async fn cancelling_a_sale_also_cancels_fulfillment(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "sale-cancel-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "sale-cancel-admin", "secret123").await;

    let order_id =
        create_checkout_order(&app, "Sale Cancel Buyer", "sale-cancel@example.com", 1).await;

    let (advance_status, advance_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/orders/{order_id}/fulfillment"),
        Some(&token),
        Some(json!({ "to_status": "picking", "note": "start picking" })),
    )
    .await;
    assert_eq!(advance_status, StatusCode::OK, "{advance_body}");

    let (cancel_status, cancel_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/sales/{order_id}/status"),
        Some(&token),
        Some(json!({ "status": "cancelled", "note": "customer backed out" })),
    )
    .await;
    assert_eq!(cancel_status, StatusCode::OK, "{cancel_body}");

    let fulfillment_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT fulfillment_status
        FROM orders
        WHERE id = $1
        "#,
    )
    .bind(order_id as i32)
    .fetch_one(&pool)
    .await
    .expect("order should load");
    assert_eq!(fulfillment_status, "canceled");

    let history_changed_by = sqlx::query_scalar::<_, String>(
        r#"
        SELECT changed_by
        FROM order_fulfillment_history
        WHERE order_id = $1 AND to_status = 'canceled'
        "#,
    )
    .bind(order_id as i32)
    .fetch_one(&pool)
    .await
    .expect("fulfillment history should record the cancellation");
    assert_eq!(history_changed_by, "sale-cancel-admin");
}

#[sqlx::test]
async fn public_customer_lookup_scopes_orders_by_email_case_insensitively(pool: PgPool) {
    let app = common::app(pool);

    let matching_order_id =
        create_checkout_order(&app, "Case Buyer", "CaseCustomer@example.com", 1).await;
    let other_order_id =
        create_checkout_order(&app, "Other Buyer", "other-buyer@example.com", 2).await;

    let (lookup_status, lookup_body) =
        lookup_customer(&app, "casecustomer@example.com", matching_order_id, None).await;
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

    let (blank_status, blank_body) = lookup_customer(&app, "%20%20", 1, None).await;
    assert_eq!(blank_status, StatusCode::BAD_REQUEST);
    assert_eq!(blank_body, "Email is required.");

    let (invalid_status, invalid_body) = lookup_customer(&app, "not-an-email", 1, None).await;
    assert_eq!(invalid_status, StatusCode::BAD_REQUEST);
    assert_eq!(invalid_body, "Email must be a valid address.");

    let (missing_order_status, missing_order_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/customer-portal/lookup?email=someone@example.com",
        None,
        None,
    )
    .await;
    assert_eq!(missing_order_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        missing_order_body,
        "An order ID is required to look up your account."
    );
}

#[sqlx::test]
async fn public_customer_lookup_rejects_unmatched_email_and_order_id(pool: PgPool) {
    let app = common::app(pool);

    let (status, body) = lookup_customer(&app, "missing-customer@example.com", 999_999, None).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "{body}");
    assert_eq!(
        body,
        "No matching order was found for that email and order ID."
    );
}

#[sqlx::test]
async fn public_customer_lookup_rejects_profile_only_customers_without_an_order(pool: PgPool) {
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

    // No order exists for this email, so there is nothing to prove ownership with — a
    // profile with zero orders can no longer be retrieved through the public lookup.
    let (status, body) = lookup_customer(&app, "profile-only@example.com", 1, None).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "{body}");
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

    let (status, body) = lookup_customer(&app, "order-only@example.com", order_id, None).await;
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

    // Use the oldest order (outside the 20-row display window) to prove that ownership
    // verification checks all of a customer's orders, not just the ones later returned.
    let (status, body) =
        lookup_customer(&app, "limit-buyer@example.com", created_order_ids[0], None).await;
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

    let (status, body) = lookup_customer(
        &app,
        "requested@example.com",
        requested_order_id,
        Some(&token),
    )
    .await;
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

#[sqlx::test]
async fn admin_shipping_rate_update_changes_checkout_quote(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "shipping-settings", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "shipping-settings", "secret123").await;

    let (update_status, update_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/settings/shipping.standard.parcel.base_cents",
        Some(&token),
        Some(json!({ "value": "1000" })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{update_body}");

    let (quote_status, quote_body) = common::request(
        app,
        Method::POST,
        "/api/checkout/quote",
        None,
        Some(json!({
            "fulfillment_method": "delivery",
            "shipping_address": {
                "recipient_name": "Shipping Buyer",
                "phone": "017-4050100",
                "address_line1": "100 Jalan Main",
                "city": "Sibu",
                "state": "Sarawak",
                "postal_code": "96000",
                "country_code": "MY"
            },
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(quote_status, StatusCode::OK, "{quote_body}");

    let standard = quote_body["shipping_options"]
        .as_array()
        .and_then(|options| options.iter().find(|option| option["code"] == "standard"))
        .expect("standard shipping option");
    assert_eq!(standard["shipping_cents"], 1099);
}

#[sqlx::test]
async fn settings_update_rejects_out_of_range_tax_rate(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "settings-tax", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "settings-tax", "secret123").await;

    let (status, body) = common::request(
        app,
        Method::PUT,
        "/api/admin/settings/sales.default_tax_rate_bps",
        Some(&token),
        Some(json!({ "value": "10001" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
}

#[sqlx::test]
async fn settings_update_rejects_invalid_currency_code(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "settings-currency", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "settings-currency", "secret123").await;

    let (status, body) = common::request(
        app,
        Method::PUT,
        "/api/admin/settings/general.currency_code",
        Some(&token),
        Some(json!({ "value": "usd" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
}

#[sqlx::test]
async fn settings_update_rejects_sequence_moving_backwards(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "settings-sequence", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "settings-sequence", "secret123").await;

    let (forward_status, forward_body) = common::request(
        app.clone(),
        Method::PUT,
        "/api/admin/settings/invoicing.next_sequence",
        Some(&token),
        Some(json!({ "value": "2000" })),
    )
    .await;
    assert_eq!(forward_status, StatusCode::OK, "{forward_body}");

    let (backward_status, backward_body) = common::request(
        app,
        Method::PUT,
        "/api/admin/settings/invoicing.next_sequence",
        Some(&token),
        Some(json!({ "value": "1500" })),
    )
    .await;
    assert_eq!(backward_status, StatusCode::BAD_REQUEST, "{backward_body}");
}

#[sqlx::test]
async fn concurrent_invoice_creation_allocates_distinct_sequential_numbers(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "invoice-race-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "invoice-race-admin", "secret123").await;

    let first_order_id =
        create_checkout_order(&app, "Race Buyer One", "race-one@example.com", 1).await;
    let second_order_id =
        create_checkout_order(&app, "Race Buyer Two", "race-two@example.com", 2).await;

    let first_app = app.clone();
    let first_token = token.clone();
    let second_app = app.clone();
    let second_token = token.clone();
    let first_path = format!("/api/admin/invoices/from-order/{first_order_id}");
    let second_path = format!("/api/admin/invoices/from-order/{second_order_id}");

    let (first_result, second_result) = tokio::join!(
        common::request(
            first_app,
            Method::POST,
            &first_path,
            Some(&first_token),
            Some(json!({ "discount_cents": 0 })),
        ),
        common::request(
            second_app,
            Method::POST,
            &second_path,
            Some(&second_token),
            Some(json!({ "discount_cents": 0 })),
        )
    );

    let (first_status, first_body) = first_result;
    let (second_status, second_body) = second_result;
    assert_eq!(first_status, StatusCode::CREATED, "{first_body}");
    assert_eq!(second_status, StatusCode::CREATED, "{second_body}");
    assert_ne!(first_body["invoice_number"], second_body["invoice_number"]);
}

#[sqlx::test]
async fn dashboard_live_metrics_reflect_orders_and_unpaid_invoices(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "metrics-admin", "secret123").await;
    let app = common::app(pool);
    let token = common::login(app.clone(), "metrics-admin", "secret123").await;

    let (order_status, order_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(json!({
            "customer_name": "Metrics Buyer",
            "customer_email": "metrics-buyer@example.com",
            "items": [{ "product_id": 1, "quantity": 1 }]
        })),
    )
    .await;
    assert_eq!(order_status, StatusCode::CREATED, "{order_body}");
    let order_id = order_body["id"].as_i64().expect("order id");
    // order_sales_meta.total_cents (tax-inclusive) is written at checkout time, so the
    // dashboard's revenue_today_cents reflects tax, not the pre-tax subtotal.
    let order_total = order_body["total_cents"].as_i64().expect("total");

    let (invoice_status, invoice_body) = common::request(
        app.clone(),
        Method::POST,
        &format!("/api/admin/invoices/from-order/{order_id}"),
        Some(&token),
        Some(json!({ "discount_cents": 0 })),
    )
    .await;
    assert_eq!(invoice_status, StatusCode::CREATED, "{invoice_body}");
    let invoice_total = invoice_body["total_cents"].as_i64().expect("invoice total");

    let (status, body) =
        common::request(app, Method::GET, "/api/admin/dashboard", Some(&token), None).await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let live = &body["live_metrics"];
    assert_eq!(live["revenue_today_cents"].as_i64(), Some(order_total));
    assert_eq!(live["orders_awaiting_fulfillment"].as_i64(), Some(1));
    assert_eq!(live["unpaid_invoice_count"].as_i64(), Some(1));
    assert_eq!(
        live["unpaid_invoice_amount_cents"].as_i64(),
        Some(invoice_total)
    );
}

#[sqlx::test]
async fn audit_events_require_permission_and_record_mutations(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "audit-admin", "secret123").await;

    sqlx::query(
        r#"
        INSERT INTO roles (name, description, is_super_admin)
        VALUES ('Auditless', 'No overview access', FALSE)
        "#,
    )
    .execute(&pool)
    .await
    .expect("role should be created");
    common::create_admin(&pool, "Auditless", "audit-no-access", "secret123").await;

    let app = common::app(pool.clone());

    let no_access_token = common::login(app.clone(), "audit-no-access", "secret123").await;
    let (forbidden_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/audit-events",
        Some(&no_access_token),
        None,
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);

    let super_token = common::login(app.clone(), "audit-admin", "secret123").await;

    let (settings_status, settings_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/settings",
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(settings_status, StatusCode::OK, "{settings_body}");
    let setting_key = settings_body[0]["key"]
        .as_str()
        .expect("setting key")
        .to_string();

    let (update_status, update_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/settings/{setting_key}"),
        Some(&super_token),
        Some(json!({ "value": "updated-value" })),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK, "{update_body}");

    let (events_status, events_body) = common::request(
        app,
        Method::GET,
        "/api/admin/audit-events",
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(events_status, StatusCode::OK, "{events_body}");
    let events = events_body.as_array().expect("events array");

    let matching_setting_events: Vec<_> = events
        .iter()
        .filter(|event| event["entity_type"] == "setting" && event["entity_id"] == setting_key)
        .collect();
    assert_eq!(
        matching_setting_events.len(),
        1,
        "expected exactly one audit event for the setting update: {events:?}"
    );
    assert_eq!(matching_setting_events[0]["action"], "update");
    assert_eq!(matching_setting_events[0]["actor"], "audit-admin");

    let login_event = events
        .iter()
        .find(|event| event["action"] == "login" && event["actor"] == "audit-admin");
    assert!(
        login_event.is_some(),
        "login should be recorded: {events:?}"
    );
}

#[sqlx::test]
async fn audit_log_failures_do_not_fail_mutations(pool: PgPool) {
    common::create_admin(&pool, "Super Admin", "audit-resilient-admin", "secret123").await;
    let app = common::app(pool.clone());
    let token = common::login(app.clone(), "audit-resilient-admin", "secret123").await;

    sqlx::query("DROP TABLE audit_events")
        .execute(&pool)
        .await
        .expect("audit_events table should drop");

    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/admin/categories",
        Some(&token),
        Some(json!({
            "slug": "resilience-check",
            "name": "Resilience Check",
            "teaser": "Testing audit resilience"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "{body}");
}
