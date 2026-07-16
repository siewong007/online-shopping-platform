mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;

const PROMOTION_DISCOUNT_CENTS: i32 = 500;
const VOUCHER_DISCOUNT_CENTS: i32 = 300;
const VOUCHER_CODE: &str = "GUEST-ONCE";

struct SeededOffers {
    promotion_id: i32,
    voucher_id: i32,
}

async fn seed_actionable_offers(pool: &PgPool) -> SeededOffers {
    let promotion_id = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO promotions (
            label,
            title,
            description,
            sort_order,
            discount_type,
            discount_value,
            minimum_subtotal_cents,
            is_active,
            is_stackable,
            max_redemptions
        )
        VALUES ($1, $2, $3, 1000, 'fixed_cents', $4, 0, TRUE, TRUE, NULL)
        RETURNING id
        "#,
    )
    .bind("Guest stackable promotion")
    .bind("Guest promotion")
    .bind("A fixed promotion for guest checkout coverage.")
    .bind(PROMOTION_DISCOUNT_CENTS)
    .fetch_one(pool)
    .await
    .expect("actionable promotion should seed");

    let voucher_id = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO vouchers (
            code,
            title,
            description,
            discount_type,
            discount_value,
            minimum_subtotal_cents,
            is_active,
            is_stackable,
            max_redemptions,
            is_public
        )
        VALUES ($1, $2, $3, 'fixed_cents', $4, 0, TRUE, TRUE, 1, TRUE)
        RETURNING id
        "#,
    )
    .bind(VOUCHER_CODE)
    .bind("Guest one-use voucher")
    .bind("A one-use public voucher for guest checkout coverage.")
    .bind(VOUCHER_DISCOUNT_CENTS)
    .fetch_one(pool)
    .await
    .expect("public voucher should seed");

    SeededOffers {
        promotion_id,
        voucher_id,
    }
}

async fn seeded_cart_product(pool: &PgPool) -> (i32, i32) {
    sqlx::query_as::<_, (i32, i32)>(
        r#"
        SELECT id, price_cents
        FROM products
        WHERE stock_quantity >= 2
          AND price_cents > $1
        ORDER BY price_cents DESC, id
        LIMIT 1
        "#,
    )
    .bind(PROMOTION_DISCOUNT_CENTS + VOUCHER_DISCOUNT_CENTS)
    .fetch_one(pool)
    .await
    .expect("a seeded in-stock product should support the guest cart")
}

fn quote_payload(product_id: i32, promotion_id: i32) -> Value {
    json!({
        "items": [{ "product_id": product_id, "quantity": 1 }],
        "promotion_id": promotion_id,
        "voucher_code": VOUCHER_CODE
    })
}

fn checkout_payload(product_id: i32, promotion_id: i32, email: &str) -> Value {
    json!({
        "customer_name": "Guest Offer Buyer",
        "customer_email": email,
        "items": [{ "product_id": product_id, "quantity": 1 }],
        "promotion_id": promotion_id,
        "voucher_code": VOUCHER_CODE
    })
}

fn admin_promotion_payload(title: &str, discount_type: &str, discount_value: i32) -> Value {
    json!({
        "label": "Campaign test",
        "title": title,
        "description": "Promotion management regression coverage.",
        "discount_type": discount_type,
        "discount_value": discount_value,
        "minimum_subtotal_cents": 0,
        "starts_at": null,
        "ends_at": null,
        "is_active": true,
        "is_stackable": true,
        "max_redemptions": null,
        "sort_order": null
    })
}

fn admin_voucher_payload(code: &str, discount_value: i32) -> Value {
    json!({
        "code": code,
        "title": "Campaign test voucher",
        "description": "Voucher management regression coverage.",
        "discount_type": "fixed_cents",
        "discount_value": discount_value,
        "minimum_subtotal_cents": 0,
        "starts_at": null,
        "ends_at": null,
        "is_active": true,
        "is_stackable": true,
        "max_redemptions": null,
        "is_public": true
    })
}

fn cents(body: &Value, field: &str) -> i64 {
    body[field]
        .as_i64()
        .unwrap_or_else(|| panic!("{field} should be an integer amount: {body}"))
}

fn assert_discounted_total(body: &Value) {
    let subtotal_cents = cents(body, "subtotal_cents");
    let discount_cents = cents(body, "discount_cents");
    let tax_cents = cents(body, "tax_cents");
    let total_cents = cents(body, "total_cents");

    assert!(discount_cents > 0, "{body}");
    assert_eq!(
        total_cents,
        subtotal_cents - discount_cents + tax_cents,
        "{body}"
    );
}

fn assert_applied_offers(body: &Value, seeded: &SeededOffers) {
    let applied_offers = body["applied_offers"]
        .as_array()
        .expect("applied_offers should be an array");

    assert_eq!(applied_offers.len(), 2, "{body}");
    assert!(
        applied_offers.iter().any(|offer| {
            offer["promotion_id"].as_i64() == Some(i64::from(seeded.promotion_id))
        })
    );
    assert!(
        applied_offers
            .iter()
            .any(|offer| offer["voucher_id"].as_i64() == Some(i64::from(seeded.voucher_id)))
    );
}

#[sqlx::test]
async fn guest_offers_returns_actionable_public_offers_without_authentication(pool: PgPool) {
    let seeded = seed_actionable_offers(&pool).await;
    sqlx::query(
        r#"
        INSERT INTO promotions (
            label,
            title,
            description,
            sort_order,
            discount_type,
            discount_value,
            is_active,
            is_stackable
        )
        VALUES ($1, $2, $3, 1001, NULL, NULL, FALSE, FALSE)
        "#,
    )
    .bind("Display only promotion")
    .bind("Hidden display-only promotion")
    .bind("A non-actionable promotion that must not be public.")
    .execute(&pool)
    .await
    .expect("display-only promotion should seed");

    let app = common::app(pool);
    let (status, body) = common::request(app, Method::GET, "/api/offers", None, None).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    let promotions = body["promotions"]
        .as_array()
        .expect("promotions should be an array");
    let promotion = promotions
        .iter()
        .find(|promotion| promotion["id"].as_i64() == Some(i64::from(seeded.promotion_id)))
        .expect("actionable promotion should be returned");
    assert_eq!(promotion["is_stackable"].as_bool(), Some(true));
    assert!(
        !promotions
            .iter()
            .any(|promotion| { promotion["title"] == "Hidden display-only promotion" })
    );

    let vouchers = body["vouchers"]
        .as_array()
        .expect("vouchers should be an array");
    let voucher = vouchers
        .iter()
        .find(|voucher| voucher["id"].as_i64() == Some(i64::from(seeded.voucher_id)))
        .expect("public voucher should be returned");
    assert_eq!(voucher["code"], VOUCHER_CODE);
    assert_eq!(voucher["is_stackable"].as_bool(), Some(true));
}

#[sqlx::test]
async fn guest_checkout_quote_applies_stackable_promotion_and_voucher(pool: PgPool) {
    let seeded = seed_actionable_offers(&pool).await;
    let (product_id, price_cents) = seeded_cart_product(&pool).await;
    let app = common::app(pool);

    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/checkout/quote",
        None,
        Some(quote_payload(product_id, seeded.promotion_id)),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(cents(&body, "subtotal_cents"), i64::from(price_cents));
    assert_eq!(
        cents(&body, "discount_cents"),
        i64::from(PROMOTION_DISCOUNT_CENTS + VOUCHER_DISCOUNT_CENTS)
    );
    assert_discounted_total(&body);
    assert_applied_offers(&body, &seeded);
}

#[sqlx::test]
async fn guest_checkout_rejects_non_stackable_offers_without_consuming_stock_or_redemptions(
    pool: PgPool,
) {
    let seeded = seed_actionable_offers(&pool).await;
    let (product_id, _) = seeded_cart_product(&pool).await;
    sqlx::query(
        r#"
        UPDATE vouchers
        SET is_stackable = FALSE
        WHERE id = $1
        "#,
    )
    .bind(seeded.voucher_id)
    .execute(&pool)
    .await
    .expect("voucher should become non-stackable");

    let stock_before = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT stock_quantity
        FROM products
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("product stock should load");

    let app = common::app(pool.clone());
    let email = "non-stackable-guest@example.com";
    let (status, body) = common::request(
        app,
        Method::POST,
        "/api/checkout",
        None,
        Some(checkout_payload(product_id, seeded.promotion_id, email)),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
    assert!(
        body.to_string().contains("cannot be combined"),
        "expected a stackability error, got {body}"
    );

    let stock_after = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT stock_quantity
        FROM products
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("product stock should load after rejected checkout");
    assert_eq!(stock_after, stock_before);

    let (promotion_redemptions, voucher_redemptions) = sqlx::query_as::<_, (i32, i32)>(
        r#"
        SELECT
            (SELECT redemption_count FROM promotions WHERE id = $1),
            (SELECT redemption_count FROM vouchers WHERE id = $2)
        "#,
    )
    .bind(seeded.promotion_id)
    .bind(seeded.voucher_id)
    .fetch_one(&pool)
    .await
    .expect("offer redemption counts should load");
    assert_eq!(promotion_redemptions, 0);
    assert_eq!(voucher_redemptions, 0);

    let rejected_order_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM orders
        WHERE customer_email = $1
        "#,
    )
    .bind(email)
    .fetch_one(&pool)
    .await
    .expect("rejected checkout order count should load");
    assert_eq!(rejected_order_count, 0);
}

#[sqlx::test]
async fn guest_checkout_persists_discounts_and_prevents_second_voucher_redemption(pool: PgPool) {
    let seeded = seed_actionable_offers(&pool).await;
    let (product_id, price_cents) = seeded_cart_product(&pool).await;
    let app = common::app(pool.clone());

    let (status, body) = common::request(
        app.clone(),
        Method::POST,
        "/api/checkout",
        None,
        Some(checkout_payload(
            product_id,
            seeded.promotion_id,
            "guest-offer@example.com",
        )),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "{body}");
    assert_eq!(cents(&body, "subtotal_cents"), i64::from(price_cents));
    assert_eq!(
        cents(&body, "discount_cents"),
        i64::from(PROMOTION_DISCOUNT_CENTS + VOUCHER_DISCOUNT_CENTS)
    );
    assert_discounted_total(&body);
    assert_applied_offers(&body, &seeded);

    let order_id = body["id"]
        .as_i64()
        .expect("checkout response should include id") as i32;
    let (persisted_discount_cents, persisted_tax_cents, persisted_total_cents) =
        sqlx::query_as::<_, (i32, i32, i32)>(
            r#"
            SELECT discount_cents, tax_cents, total_cents
            FROM order_sales_meta
            WHERE order_id = $1
            "#,
        )
        .bind(order_id)
        .fetch_one(&pool)
        .await
        .expect("checkout totals should persist");
    assert_eq!(
        i64::from(persisted_discount_cents),
        cents(&body, "discount_cents")
    );
    assert_eq!(i64::from(persisted_tax_cents), cents(&body, "tax_cents"));
    assert_eq!(
        i64::from(persisted_total_cents),
        cents(&body, "total_cents")
    );

    let applied_offer_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM order_offer_redemptions
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_one(&pool)
    .await
    .expect("applied offers should persist");
    assert_eq!(applied_offer_count, 2);

    let redemption_count = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT redemption_count
        FROM vouchers
        WHERE id = $1
        "#,
    )
    .bind(seeded.voucher_id)
    .fetch_one(&pool)
    .await
    .expect("voucher should load");
    assert_eq!(redemption_count, 1);

    let (retry_status, retry_body) = common::request(
        app,
        Method::POST,
        "/api/checkout",
        None,
        Some(checkout_payload(
            product_id,
            seeded.promotion_id,
            "guest-offer-retry@example.com",
        )),
    )
    .await;
    assert!(
        retry_status.is_client_error(),
        "expected client error, got {retry_status}: {retry_body}"
    );

    let retry_redemption_count = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT redemption_count
        FROM vouchers
        WHERE id = $1
        "#,
    )
    .bind(seeded.voucher_id)
    .fetch_one(&pool)
    .await
    .expect("voucher should load after retry");
    assert_eq!(retry_redemption_count, 1);
}

#[sqlx::test]
async fn admin_offer_management_enforces_campaign_permissions_and_crud(pool: PgPool) {
    common::create_admin(
        &pool,
        "Catalog Specialist",
        "campaign-catalog-specialist",
        "secret123",
    )
    .await;
    common::create_admin(&pool, "Super Admin", "campaign-super-admin", "secret123").await;
    let app = common::app(pool);

    let (missing_status, _) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/promotions",
        None,
        None,
    )
    .await;
    assert_eq!(missing_status, StatusCode::UNAUTHORIZED);

    let catalog_token =
        common::login(app.clone(), "campaign-catalog-specialist", "secret123").await;
    let (read_status, read_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/promotions",
        Some(&catalog_token),
        None,
    )
    .await;
    assert_eq!(read_status, StatusCode::OK, "{read_body}");
    let (forbidden_status, _) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/promotions",
        Some(&catalog_token),
        Some(admin_promotion_payload(
            "Unauthorized campaign",
            "fixed_cents",
            500,
        )),
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);

    let super_token = common::login(app.clone(), "campaign-super-admin", "secret123").await;
    let (invalid_status, invalid_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/promotions",
        Some(&super_token),
        Some(admin_promotion_payload(
            "Invalid percentage",
            "percent_bps",
            10_001,
        )),
    )
    .await;
    assert_eq!(invalid_status, StatusCode::BAD_REQUEST, "{invalid_body}");
    assert!(
        invalid_body
            .to_string()
            .contains("cannot exceed 10000 basis points"),
        "expected percentage validation error, got {invalid_body}"
    );

    let (promotion_status, promotion_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/promotions",
        Some(&super_token),
        Some(admin_promotion_payload(
            "Campaign promotion",
            "fixed_cents",
            500,
        )),
    )
    .await;
    assert_eq!(promotion_status, StatusCode::CREATED, "{promotion_body}");
    let promotion_id = promotion_body["id"]
        .as_i64()
        .expect("created promotion should include id");

    let (voucher_status, voucher_body) = common::request(
        app.clone(),
        Method::POST,
        "/api/admin/vouchers",
        Some(&super_token),
        Some(admin_voucher_payload("CAMPAIGN-CRUD", 300)),
    )
    .await;
    assert_eq!(voucher_status, StatusCode::CREATED, "{voucher_body}");
    let voucher_id = voucher_body["id"]
        .as_i64()
        .expect("created voucher should include id");

    let (updated_promotion_status, updated_promotion_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/promotions/{promotion_id}"),
        Some(&super_token),
        Some(admin_promotion_payload(
            "Campaign promotion",
            "fixed_cents",
            700,
        )),
    )
    .await;
    assert_eq!(
        updated_promotion_status,
        StatusCode::OK,
        "{updated_promotion_body}"
    );
    assert_eq!(updated_promotion_body["discount_value"], 700);

    let (updated_voucher_status, updated_voucher_body) = common::request(
        app.clone(),
        Method::PUT,
        &format!("/api/admin/vouchers/{voucher_id}"),
        Some(&super_token),
        Some(admin_voucher_payload("CAMPAIGN-CRUD-UPDATED", 400)),
    )
    .await;
    assert_eq!(
        updated_voucher_status,
        StatusCode::OK,
        "{updated_voucher_body}"
    );
    assert_eq!(updated_voucher_body["code"], "CAMPAIGN-CRUD-UPDATED");

    let (promotions_status, promotions_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/promotions",
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(promotions_status, StatusCode::OK, "{promotions_body}");
    assert!(
        promotions_body.as_array().is_some_and(|promotions| {
            promotions
                .iter()
                .any(|promotion| promotion["id"] == promotion_id)
        }),
        "created promotion should be listed: {promotions_body}"
    );

    let (vouchers_status, vouchers_body) = common::request(
        app.clone(),
        Method::GET,
        "/api/admin/vouchers",
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(vouchers_status, StatusCode::OK, "{vouchers_body}");
    assert!(
        vouchers_body
            .as_array()
            .is_some_and(|vouchers| { vouchers.iter().any(|voucher| voucher["id"] == voucher_id) }),
        "created voucher should be listed: {vouchers_body}"
    );

    let (delete_voucher_status, delete_voucher_body) = common::request(
        app.clone(),
        Method::DELETE,
        &format!("/api/admin/vouchers/{voucher_id}"),
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(
        delete_voucher_status,
        StatusCode::NO_CONTENT,
        "{delete_voucher_body}"
    );

    let (delete_promotion_status, delete_promotion_body) = common::request(
        app,
        Method::DELETE,
        &format!("/api/admin/promotions/{promotion_id}"),
        Some(&super_token),
        None,
    )
    .await;
    assert_eq!(
        delete_promotion_status,
        StatusCode::NO_CONTENT,
        "{delete_promotion_body}"
    );
}
