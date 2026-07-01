use std::collections::HashMap;

use anyhow::{Result, bail};
use sqlx::PgPool;

use crate::models::{
    ActivityItem, AdminDashboardPayload, AdminMetric, CampaignOption, Category,
    CreateCategoryInput, CreateCustomerPortalProfileInput, CreateOrderInput, CreatePaymentInput,
    CreateProductInput, CreateRoleInput, CustomerPortalProfile, FulfillmentItem, InventoryItem,
    Order, OrderItem, Payment, PermissionPage, PermissionsPayload, ProStat, Product, Promotion,
    Role, RolePagePermission, ServiceItem, StorefrontPayload, UpdateCustomerPortalProfileInput,
    UpdatePaymentInput, UpdateRoleInput, UpdateRolePagePermissionInput,
};

#[derive(Debug, Clone, Copy)]
pub enum PermissionAction {
    Create,
    Update,
    Delete,
}

pub async fn fetch_storefront(pool: &PgPool) -> Result<StorefrontPayload> {
    let categories = sqlx::query_as::<_, Category>(
        r#"
        SELECT slug, name, teaser
        FROM categories
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let products = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, name, category_slug, price_cents, badge, description, tone, featured
        FROM products
        WHERE featured = true
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let promotions = sqlx::query_as::<_, Promotion>(
        r#"
        SELECT label, title, description
        FROM promotions
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let services = sqlx::query_as::<_, ServiceItem>(
        r#"
        SELECT name, description
        FROM services
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let pro_stats = sqlx::query_as::<_, ProStat>(
        r#"
        SELECT label, value
        FROM pro_stats
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(StorefrontPayload {
        categories,
        products,
        promotions,
        services,
        pro_stats,
    })
}

pub async fn fetch_admin_dashboard(pool: &PgPool) -> Result<AdminDashboardPayload> {
    let metrics = sqlx::query_as::<_, AdminMetric>(
        r#"
        SELECT label, value, detail
        FROM admin_metrics
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let inventory = sqlx::query_as::<_, InventoryItem>(
        r#"
        SELECT department, on_hand, lead_region, status, note
        FROM inventory_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let fulfillment = sqlx::query_as::<_, FulfillmentItem>(
        r#"
        SELECT stage, title, detail
        FROM fulfillment_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let campaigns = sqlx::query_as::<_, CampaignOption>(
        r#"
        SELECT name, description
        FROM campaign_options
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let activity = sqlx::query_as::<_, ActivityItem>(
        r#"
        SELECT happened_at, detail
        FROM activity_items
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(AdminDashboardPayload {
        metrics,
        inventory,
        fulfillment,
        campaigns,
        activity,
    })
}

pub async fn create_category(pool: &PgPool, input: &CreateCategoryInput) -> Result<Category> {
    let slug = input.slug.trim();
    let name = input.name.trim();
    let teaser = input.teaser.trim();

    if slug.is_empty() || name.is_empty() || teaser.is_empty() {
        bail!("Category slug, name and teaser are required.");
    }

    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)
        "#,
    )
    .bind(slug)
    .fetch_one(pool)
    .await?;

    if exists {
        bail!("A category with that slug already exists.");
    }

    let next_sort_order = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM categories
        "#,
    )
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (slug, name, teaser, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING slug, name, teaser
        "#,
    )
    .bind(slug)
    .bind(name)
    .bind(teaser)
    .bind(next_sort_order)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_product(pool: &PgPool, input: &CreateProductInput) -> Result<Product> {
    let name = input.name.trim();
    let category_slug = input.category_slug.trim();
    let badge = input.badge.trim();
    let description = input.description.trim();
    let tone = input.tone.trim();

    if name.is_empty()
        || category_slug.is_empty()
        || badge.is_empty()
        || description.is_empty()
        || tone.is_empty()
    {
        bail!("Product name, category, badge, tone and description are required.");
    }

    if input.price_cents < 0 {
        bail!("Product price must be zero or greater.");
    }

    let category_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)
        "#,
    )
    .bind(category_slug)
    .fetch_one(pool)
    .await?;

    if !category_exists {
        bail!("Select a valid category before creating a product.");
    }

    let next_sort_order = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM products
        "#,
    )
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (name, category_slug, price_cents, badge, description, tone, featured, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, category_slug, price_cents, badge, description, tone, featured
        "#,
    )
    .bind(name)
    .bind(category_slug)
    .bind(input.price_cents)
    .bind(badge)
    .bind(description)
    .bind(tone)
    .bind(input.featured)
    .bind(next_sort_order)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_order(pool: &PgPool, input: &CreateOrderInput) -> Result<Order> {
    let customer_name = input.customer_name.trim();
    let customer_email = input.customer_email.trim();

    if customer_name.is_empty() || customer_email.is_empty() {
        bail!("Customer name and email are required.");
    }

    if !customer_email.contains('@') {
        bail!("Customer email must be a valid address.");
    }

    if input.items.is_empty() {
        bail!("An order must contain at least one item.");
    }

    let mut tx = pool.begin().await?;

    let mut subtotal_cents: i64 = 0;
    let mut line_items: Vec<OrderItem> = Vec::with_capacity(input.items.len());

    for item in &input.items {
        if item.quantity <= 0 {
            bail!("Order item quantity must be greater than zero.");
        }

        let product = sqlx::query_as::<_, (String, i32)>(
            r#"
            SELECT name, price_cents
            FROM products
            WHERE id = $1
            "#,
        )
        .bind(item.product_id)
        .fetch_optional(&mut *tx)
        .await?;

        let Some((product_name, unit_price_cents)) = product else {
            bail!("Product {} does not exist.", item.product_id);
        };

        subtotal_cents += i64::from(unit_price_cents) * i64::from(item.quantity);
        line_items.push(OrderItem {
            product_id: item.product_id,
            product_name,
            unit_price_cents,
            quantity: item.quantity,
        });
    }

    let subtotal_cents = i32::try_from(subtotal_cents)
        .map_err(|_| anyhow::anyhow!("Order subtotal exceeds the supported maximum."))?;

    let (order_id, created_at) = sqlx::query_as::<_, (i32, String)>(
        r#"
        INSERT INTO orders (customer_name, customer_email, subtotal_cents)
        VALUES ($1, $2, $3)
        RETURNING id, created_at::text
        "#,
    )
    .bind(customer_name)
    .bind(customer_email)
    .bind(subtotal_cents)
    .fetch_one(&mut *tx)
    .await?;

    for item in &line_items {
        sqlx::query(
            r#"
            INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(order_id)
        .bind(item.product_id)
        .bind(&item.product_name)
        .bind(item.unit_price_cents)
        .bind(item.quantity)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        r#"
        INSERT INTO order_sales_meta (order_id, status, payment_status, channel, total_cents)
        VALUES ($1, 'confirmed', 'unpaid', 'web', $2)
        ON CONFLICT (order_id) DO NOTHING
        "#,
    )
    .bind(order_id)
    .bind(subtotal_cents)
    .execute(&mut *tx)
    .await?;

    let earned_points = subtotal_cents / 100;
    let customer_portal_email = customer_email.to_lowercase();
    sqlx::query(
        r#"
        INSERT INTO customer_portal_profiles
            (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders, last_purchase_at)
        VALUES ($1, $2, 'Bronze', $3, $4, 1, $5::timestamptz)
        ON CONFLICT (customer_email) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            points_balance = customer_portal_profiles.points_balance + EXCLUDED.points_balance,
            lifetime_purchase_cents = customer_portal_profiles.lifetime_purchase_cents + EXCLUDED.lifetime_purchase_cents,
            total_orders = customer_portal_profiles.total_orders + 1,
            last_purchase_at = EXCLUDED.last_purchase_at,
            updated_at = now()
        "#,
    )
    .bind(customer_name)
    .bind(customer_portal_email)
    .bind(earned_points)
    .bind(subtotal_cents)
    .bind(&created_at)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Order {
        id: order_id,
        customer_name: customer_name.to_string(),
        customer_email: customer_email.to_string(),
        subtotal_cents,
        created_at,
        items: line_items,
    })
}

pub async fn fetch_orders(pool: &PgPool) -> Result<Vec<Order>> {
    let orders = sqlx::query_as::<_, (i32, String, String, i32, String)>(
        r#"
        SELECT id, customer_name, customer_email, subtotal_cents, created_at::text
        FROM orders
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let item_rows = sqlx::query_as::<_, (i32, i32, String, i32, i32)>(
        r#"
        SELECT order_id, product_id, product_name, unit_price_cents, quantity
        FROM order_items
        ORDER BY order_id, id
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut items_by_order: HashMap<i32, Vec<OrderItem>> = HashMap::new();
    for (order_id, product_id, product_name, unit_price_cents, quantity) in item_rows {
        items_by_order.entry(order_id).or_default().push(OrderItem {
            product_id,
            product_name,
            unit_price_cents,
            quantity,
        });
    }

    Ok(orders
        .into_iter()
        .map(
            |(id, customer_name, customer_email, subtotal_cents, created_at)| Order {
                id,
                customer_name,
                customer_email,
                subtotal_cents,
                created_at,
                items: items_by_order.remove(&id).unwrap_or_default(),
            },
        )
        .collect())
}

fn validate_order_input(input: &CreateOrderInput) -> Result<(&str, &str)> {
    let customer_name = input.customer_name.trim();
    let customer_email = input.customer_email.trim();

    if customer_name.is_empty() || customer_email.is_empty() {
        bail!("Customer name and email are required.");
    }

    if !customer_email.contains('@') {
        bail!("Customer email must be a valid address.");
    }

    if input.items.is_empty() {
        bail!("An order must contain at least one item.");
    }

    Ok((customer_name, customer_email))
}

async fn resolve_order_line_items(
    pool: &PgPool,
    input: &CreateOrderInput,
) -> Result<(i32, Vec<OrderItem>)> {
    let mut subtotal_cents: i64 = 0;
    let mut line_items: Vec<OrderItem> = Vec::with_capacity(input.items.len());

    for item in &input.items {
        if item.quantity <= 0 {
            bail!("Order item quantity must be greater than zero.");
        }

        let product = sqlx::query_as::<_, (String, i32)>(
            r#"
            SELECT name, price_cents
            FROM products
            WHERE id = $1
            "#,
        )
        .bind(item.product_id)
        .fetch_optional(pool)
        .await?;

        let Some((product_name, unit_price_cents)) = product else {
            bail!("Product {} does not exist.", item.product_id);
        };

        subtotal_cents += i64::from(unit_price_cents) * i64::from(item.quantity);
        line_items.push(OrderItem {
            product_id: item.product_id,
            product_name,
            unit_price_cents,
            quantity: item.quantity,
        });
    }

    let subtotal_cents = i32::try_from(subtotal_cents)
        .map_err(|_| anyhow::anyhow!("Order subtotal exceeds the supported maximum."))?;

    Ok((subtotal_cents, line_items))
}

pub async fn update_order(pool: &PgPool, order_id: i32, input: &CreateOrderInput) -> Result<Order> {
    let (customer_name, customer_email) = validate_order_input(input)?;
    let (subtotal_cents, line_items) = resolve_order_line_items(pool, input).await?;
    let tax_rate_bps = fetch_setting_int(pool, "sales.default_tax_rate_bps", 0).await?;
    let mut tx = pool.begin().await?;

    let created_at = sqlx::query_scalar::<_, String>(
        r#"
        UPDATE orders
        SET customer_name = $1,
            customer_email = $2,
            subtotal_cents = $3
        WHERE id = $4
        RETURNING created_at::text
        "#,
    )
    .bind(customer_name)
    .bind(customer_email)
    .bind(subtotal_cents)
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(created_at) = created_at else {
        bail!("Order {order_id} does not exist.");
    };

    sqlx::query(
        r#"
        DELETE FROM order_items
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

    for item in &line_items {
        sqlx::query(
            r#"
            INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(order_id)
        .bind(item.product_id)
        .bind(&item.product_name)
        .bind(item.unit_price_cents)
        .bind(item.quantity)
        .execute(&mut *tx)
        .await?;
    }

    let existing_discount_cents = sqlx::query_scalar::<_, i32>(
        r#"SELECT discount_cents FROM order_sales_meta WHERE order_id = $1"#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?
    .unwrap_or(0);

    let (tax_cents, total_cents) =
        compute_tax_and_total(subtotal_cents, existing_discount_cents, tax_rate_bps);

    sqlx::query(
        r#"
        INSERT INTO order_sales_meta (order_id, tax_cents, total_cents)
        VALUES ($1, $2, $3)
        ON CONFLICT (order_id) DO UPDATE SET
            tax_cents = EXCLUDED.tax_cents,
            total_cents = EXCLUDED.total_cents,
            updated_at = now()
        "#,
    )
    .bind(order_id)
    .bind(tax_cents)
    .bind(total_cents)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Order {
        id: order_id,
        customer_name: customer_name.to_string(),
        customer_email: customer_email.to_string(),
        subtotal_cents,
        created_at,
        items: line_items,
    })
}

pub async fn delete_order(pool: &PgPool, order_id: i32) -> Result<()> {
    let result = sqlx::query(
        r#"
        DELETE FROM orders
        WHERE id = $1
        "#,
    )
    .bind(order_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Order {order_id} does not exist.");
    }

    Ok(())
}

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    sqlx::query_as::<_, Payment>(
        r#"
        SELECT payments.id,
               payments.order_id,
               orders.customer_name AS order_customer_name,
               orders.customer_email AS order_customer_email,
               orders.subtotal_cents AS order_subtotal_cents,
               payments.idempotency_key,
               payments.amount_cents,
               payments.method,
               payments.status,
               payments.reference,
               payments.notes,
               payments.processed_at::text AS processed_at,
               payments.created_at::text AS created_at,
               payments.updated_at::text AS updated_at
        FROM payments
        JOIN orders ON orders.id = payments.order_id
        ORDER BY payments.created_at DESC, payments.id DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_payment(pool: &PgPool, input: &CreatePaymentInput) -> Result<Payment> {
    let normalized = normalize_create_payment_input(input)?;
    let mut tx = pool.begin().await?;

    let existing_payment = sqlx::query_as::<_, Payment>(
        r#"
        SELECT payments.id,
               payments.order_id,
               orders.customer_name AS order_customer_name,
               orders.customer_email AS order_customer_email,
               orders.subtotal_cents AS order_subtotal_cents,
               payments.idempotency_key,
               payments.amount_cents,
               payments.method,
               payments.status,
               payments.reference,
               payments.notes,
               payments.processed_at::text AS processed_at,
               payments.created_at::text AS created_at,
               payments.updated_at::text AS updated_at
        FROM payments
        JOIN orders ON orders.id = payments.order_id
        WHERE payments.idempotency_key = $1
        FOR UPDATE OF payments
        "#,
    )
    .bind(&normalized.idempotency_key)
    .fetch_optional(&mut *tx)
    .await?;

    if let Some(payment) = existing_payment {
        if !payment_matches_create_input(&payment, &normalized) {
            bail!("Idempotency key is already associated with a different payment.");
        }

        tx.commit().await?;
        return Ok(payment);
    }

    validate_payment_capacity(
        &mut tx,
        normalized.order_id,
        normalized.amount_cents,
        &normalized.status,
        None,
    )
    .await?;

    let payment = sqlx::query_as::<_, Payment>(
        r#"
        WITH inserted AS (
            INSERT INTO payments
                (order_id, idempotency_key, amount_cents, method, status, reference, notes, processed_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $5 = 'Pending' THEN NULL ELSE now() END)
            RETURNING *
        )
        SELECT inserted.id,
               inserted.order_id,
               orders.customer_name AS order_customer_name,
               orders.customer_email AS order_customer_email,
               orders.subtotal_cents AS order_subtotal_cents,
               inserted.idempotency_key,
               inserted.amount_cents,
               inserted.method,
               inserted.status,
               inserted.reference,
               inserted.notes,
               inserted.processed_at::text AS processed_at,
               inserted.created_at::text AS created_at,
               inserted.updated_at::text AS updated_at
        FROM inserted
        JOIN orders ON orders.id = inserted.order_id
        "#,
    )
    .bind(normalized.order_id)
    .bind(&normalized.idempotency_key)
    .bind(normalized.amount_cents)
    .bind(&normalized.method)
    .bind(&normalized.status)
    .bind(&normalized.reference)
    .bind(&normalized.notes)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(payment)
}

pub async fn update_payment(
    pool: &PgPool,
    payment_id: i32,
    input: &UpdatePaymentInput,
) -> Result<Payment> {
    let normalized = normalize_update_payment_input(input)?;
    let mut tx = pool.begin().await?;

    let existing = sqlx::query_as::<_, (i32, Option<String>)>(
        r#"
        SELECT order_id, processed_at::text
        FROM payments
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(payment_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((order_id, processed_at)) = existing else {
        bail!("Payment {payment_id} does not exist.");
    };

    validate_payment_capacity(
        &mut tx,
        order_id,
        normalized.amount_cents,
        &normalized.status,
        Some(payment_id),
    )
    .await?;

    let payment = sqlx::query_as::<_, Payment>(
        r#"
        WITH updated AS (
            UPDATE payments
            SET amount_cents = $1,
                method = $2,
                status = $3,
                reference = $4,
                notes = $5,
                processed_at = CASE
                    WHEN $3 = 'Pending' THEN NULL
                    WHEN $6::timestamptz IS NULL THEN now()
                    ELSE $6::timestamptz
                END,
                updated_at = now()
            WHERE id = $7
            RETURNING *
        )
        SELECT updated.id,
               updated.order_id,
               orders.customer_name AS order_customer_name,
               orders.customer_email AS order_customer_email,
               orders.subtotal_cents AS order_subtotal_cents,
               updated.idempotency_key,
               updated.amount_cents,
               updated.method,
               updated.status,
               updated.reference,
               updated.notes,
               updated.processed_at::text AS processed_at,
               updated.created_at::text AS created_at,
               updated.updated_at::text AS updated_at
        FROM updated
        JOIN orders ON orders.id = updated.order_id
        "#,
    )
    .bind(normalized.amount_cents)
    .bind(&normalized.method)
    .bind(&normalized.status)
    .bind(&normalized.reference)
    .bind(&normalized.notes)
    .bind(processed_at)
    .bind(payment_id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(payment)
}

pub async fn delete_payment(pool: &PgPool, payment_id: i32) -> Result<()> {
    let mut tx = pool.begin().await?;

    let payment_exists = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM payments
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(payment_id)
    .fetch_optional(&mut *tx)
    .await?;

    if payment_exists.is_none() {
        bail!("Payment {payment_id} does not exist.");
    }

    sqlx::query(
        r#"
        DELETE FROM payments
        WHERE id = $1
        "#,
    )
    .bind(payment_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(())
}

pub async fn fetch_customer_portal_profiles(pool: &PgPool) -> Result<Vec<CustomerPortalProfile>> {
    sqlx::query_as::<_, CustomerPortalProfile>(
        r#"
        SELECT
            id,
            customer_name,
            customer_email,
            membership_tier,
            points_balance,
            lifetime_purchase_cents,
            total_orders,
            last_purchase_at::text AS last_purchase_at,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM customer_portal_profiles
        ORDER BY updated_at DESC, customer_name
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_customer_portal_profile(
    pool: &PgPool,
    input: &CreateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    let customer_name = input.customer_name.trim();
    let customer_email = input.customer_email.trim().to_lowercase();
    let membership_tier = input.membership_tier.trim();

    validate_customer_portal_input(
        customer_name,
        &customer_email,
        membership_tier,
        input.points_balance,
        input.lifetime_purchase_cents,
        input.total_orders,
    )?;

    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM customer_portal_profiles WHERE customer_email = $1)
        "#,
    )
    .bind(&customer_email)
    .fetch_one(pool)
    .await?;

    if exists {
        bail!("A customer portal profile with that email already exists.");
    }

    sqlx::query_as::<_, CustomerPortalProfile>(
        r#"
        INSERT INTO customer_portal_profiles
            (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            customer_name,
            customer_email,
            membership_tier,
            points_balance,
            lifetime_purchase_cents,
            total_orders,
            last_purchase_at::text AS last_purchase_at,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        "#,
    )
    .bind(customer_name)
    .bind(customer_email)
    .bind(membership_tier)
    .bind(input.points_balance)
    .bind(input.lifetime_purchase_cents)
    .bind(input.total_orders)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_customer_portal_profile(
    pool: &PgPool,
    profile_id: i32,
    input: &UpdateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    let customer_name = input.customer_name.trim();
    let customer_email = input.customer_email.trim().to_lowercase();
    let membership_tier = input.membership_tier.trim();

    validate_customer_portal_input(
        customer_name,
        &customer_email,
        membership_tier,
        input.points_balance,
        input.lifetime_purchase_cents,
        input.total_orders,
    )?;

    let email_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM customer_portal_profiles
            WHERE customer_email = $1 AND id <> $2
        )
        "#,
    )
    .bind(&customer_email)
    .bind(profile_id)
    .fetch_one(pool)
    .await?;

    if email_exists {
        bail!("A customer portal profile with that email already exists.");
    }

    let profile = sqlx::query_as::<_, CustomerPortalProfile>(
        r#"
        UPDATE customer_portal_profiles
        SET
            customer_name = $1,
            customer_email = $2,
            membership_tier = $3,
            points_balance = $4,
            lifetime_purchase_cents = $5,
            total_orders = $6,
            updated_at = now()
        WHERE id = $7
        RETURNING
            id,
            customer_name,
            customer_email,
            membership_tier,
            points_balance,
            lifetime_purchase_cents,
            total_orders,
            last_purchase_at::text AS last_purchase_at,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        "#,
    )
    .bind(customer_name)
    .bind(customer_email)
    .bind(membership_tier)
    .bind(input.points_balance)
    .bind(input.lifetime_purchase_cents)
    .bind(input.total_orders)
    .bind(profile_id)
    .fetch_optional(pool)
    .await?;

    profile.ok_or_else(|| anyhow::anyhow!("Customer portal profile does not exist."))
}

pub async fn delete_customer_portal_profile(pool: &PgPool, profile_id: i32) -> Result<()> {
    let result = sqlx::query(
        r#"
        DELETE FROM customer_portal_profiles
        WHERE id = $1
        "#,
    )
    .bind(profile_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Customer portal profile does not exist.");
    }

    Ok(())
}

pub async fn fetch_permissions(pool: &PgPool) -> Result<PermissionsPayload> {
    let roles = sqlx::query_as::<_, Role>(
        r#"
        SELECT id, name, description, is_super_admin, created_at::text AS created_at
        FROM roles
        ORDER BY is_super_admin DESC, name
        "#,
    )
    .fetch_all(pool)
    .await?;

    let pages = sqlx::query_as::<_, PermissionPage>(
        r#"
        SELECT id, slug, name, description
        FROM permission_pages
        ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let permission_rows = sqlx::query_as::<_, RolePagePermission>(
        r#"
        SELECT role_id, page_id, can_create, can_read, can_update, can_delete
        FROM role_page_permissions
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut permission_map: HashMap<(i32, i32), RolePagePermission> = permission_rows
        .into_iter()
        .map(|permission| ((permission.role_id, permission.page_id), permission))
        .collect();

    let mut permissions = Vec::with_capacity(roles.len() * pages.len());
    for role in &roles {
        for page in &pages {
            if role.is_super_admin {
                permissions.push(RolePagePermission {
                    role_id: role.id,
                    page_id: page.id,
                    can_create: true,
                    can_read: true,
                    can_update: true,
                    can_delete: true,
                });
                continue;
            }

            permissions.push(permission_map.remove(&(role.id, page.id)).unwrap_or(
                RolePagePermission {
                    role_id: role.id,
                    page_id: page.id,
                    can_create: false,
                    can_read: false,
                    can_update: false,
                    can_delete: false,
                },
            ));
        }
    }

    Ok(PermissionsPayload {
        roles,
        pages,
        permissions,
    })
}

pub async fn role_has_page_permission(
    pool: &PgPool,
    role_id: i32,
    page_slug: &str,
    action: PermissionAction,
) -> Result<bool> {
    let role_is_super_admin = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT is_super_admin
        FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .fetch_optional(pool)
    .await?;

    if role_is_super_admin.unwrap_or(false) {
        return Ok(true);
    }

    let permission = sqlx::query_as::<_, RolePagePermission>(
        r#"
        SELECT role_page_permissions.role_id,
               role_page_permissions.page_id,
               role_page_permissions.can_create,
               role_page_permissions.can_read,
               role_page_permissions.can_update,
               role_page_permissions.can_delete
        FROM role_page_permissions
        JOIN permission_pages ON permission_pages.id = role_page_permissions.page_id
        WHERE role_page_permissions.role_id = $1
          AND permission_pages.slug = $2
        "#,
    )
    .bind(role_id)
    .bind(page_slug)
    .fetch_optional(pool)
    .await?;

    Ok(match permission {
        Some(permission) => match action {
            PermissionAction::Create => permission.can_create,
            PermissionAction::Update => permission.can_update,
            PermissionAction::Delete => permission.can_delete,
        },
        None => false,
    })
}

pub async fn create_role(pool: &PgPool, input: &CreateRoleInput) -> Result<Role> {
    let name = input.name.trim();
    let description = input.description.trim();

    validate_role_input(name)?;

    let mut tx = pool.begin().await?;

    let role = sqlx::query_as::<_, Role>(
        r#"
        INSERT INTO roles (name, description, is_super_admin)
        VALUES ($1, $2, FALSE)
        RETURNING id, name, description, is_super_admin, created_at::text AS created_at
        "#,
    )
    .bind(name)
    .bind(description)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO role_page_permissions (role_id, page_id)
        SELECT $1, id
        FROM permission_pages
        ON CONFLICT (role_id, page_id) DO NOTHING
        "#,
    )
    .bind(role.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(role)
}

pub async fn update_role(pool: &PgPool, role_id: i32, input: &UpdateRoleInput) -> Result<Role> {
    let name = input.name.trim();
    let description = input.description.trim();

    validate_role_input(name)?;
    ensure_role_is_editable(pool, role_id).await?;

    sqlx::query_as::<_, Role>(
        r#"
        UPDATE roles
        SET name = $1, description = $2
        WHERE id = $3
        RETURNING id, name, description, is_super_admin, created_at::text AS created_at
        "#,
    )
    .bind(name)
    .bind(description)
    .bind(role_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn delete_role(pool: &PgPool, role_id: i32) -> Result<()> {
    ensure_role_is_editable(pool, role_id).await?;

    sqlx::query(
        r#"
        DELETE FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_role_page_permission(
    pool: &PgPool,
    input: &UpdateRolePagePermissionInput,
) -> Result<RolePagePermission> {
    ensure_role_is_editable(pool, input.role_id).await?;

    let page_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM permission_pages WHERE id = $1)
        "#,
    )
    .bind(input.page_id)
    .fetch_one(pool)
    .await?;

    if !page_exists {
        bail!("Permission page does not exist.");
    }

    let (can_create, can_read, can_update, can_delete) = normalize_permission_flags(input);

    sqlx::query_as::<_, RolePagePermission>(
        r#"
        INSERT INTO role_page_permissions
            (role_id, page_id, can_create, can_read, can_update, can_delete)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (role_id, page_id) DO UPDATE SET
            can_create = EXCLUDED.can_create,
            can_read = EXCLUDED.can_read,
            can_update = EXCLUDED.can_update,
            can_delete = EXCLUDED.can_delete
        RETURNING role_id, page_id, can_create, can_read, can_update, can_delete
        "#,
    )
    .bind(input.role_id)
    .bind(input.page_id)
    .bind(can_create)
    .bind(can_read)
    .bind(can_update)
    .bind(can_delete)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreatePaymentInput {
    order_id: i32,
    idempotency_key: String,
    amount_cents: i32,
    method: String,
    status: String,
    reference: String,
    notes: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedUpdatePaymentInput {
    amount_cents: i32,
    method: String,
    status: String,
    reference: String,
    notes: String,
}

fn normalize_create_payment_input(
    input: &CreatePaymentInput,
) -> Result<NormalizedCreatePaymentInput> {
    let method = input.method.trim();
    let status = normalize_payment_status(&input.status)?;
    let reference = input.reference.trim();
    let notes = input.notes.trim();
    let idempotency_key = input.idempotency_key.trim();

    validate_payment_input(
        input.order_id,
        input.amount_cents,
        method,
        &status,
        idempotency_key,
    )?;

    Ok(NormalizedCreatePaymentInput {
        order_id: input.order_id,
        idempotency_key: idempotency_key.to_string(),
        amount_cents: input.amount_cents,
        method: method.to_string(),
        status,
        reference: reference.to_string(),
        notes: notes.to_string(),
    })
}

fn normalize_update_payment_input(
    input: &UpdatePaymentInput,
) -> Result<NormalizedUpdatePaymentInput> {
    let method = input.method.trim();
    let status = normalize_payment_status(&input.status)?;
    let reference = input.reference.trim();
    let notes = input.notes.trim();

    validate_payment_input(1, input.amount_cents, method, &status, "existing-payment")?;

    Ok(NormalizedUpdatePaymentInput {
        amount_cents: input.amount_cents,
        method: method.to_string(),
        status,
        reference: reference.to_string(),
        notes: notes.to_string(),
    })
}

fn normalize_payment_status(status: &str) -> Result<String> {
    match status.trim().to_ascii_lowercase().as_str() {
        "pending" => Ok("Pending".to_string()),
        "captured" => Ok("Captured".to_string()),
        "refunded" => Ok("Refunded".to_string()),
        "failed" => Ok("Failed".to_string()),
        "void" => Ok("Void".to_string()),
        _ => bail!("Payment status must be Pending, Captured, Refunded, Failed or Void."),
    }
}

fn validate_payment_input(
    order_id: i32,
    amount_cents: i32,
    method: &str,
    status: &str,
    idempotency_key: &str,
) -> Result<()> {
    if order_id <= 0 {
        bail!("Select a valid order for the payment.");
    }

    if amount_cents <= 0 {
        bail!("Payment amount must be greater than zero.");
    }

    if method.is_empty() {
        bail!("Payment method is required.");
    }

    if status.is_empty() {
        bail!("Payment status is required.");
    }

    if idempotency_key.is_empty() {
        bail!("Idempotency key is required.");
    }

    if idempotency_key.len() > 128 {
        bail!("Idempotency key must be 128 characters or fewer.");
    }

    Ok(())
}

fn payment_matches_create_input(payment: &Payment, input: &NormalizedCreatePaymentInput) -> bool {
    payment.order_id == input.order_id
        && payment.idempotency_key == input.idempotency_key
        && payment.amount_cents == input.amount_cents
        && payment.method == input.method
        && payment.status == input.status
        && payment.reference == input.reference
        && payment.notes == input.notes
}

async fn validate_payment_capacity(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    order_id: i32,
    amount_cents: i32,
    status: &str,
    excluding_payment_id: Option<i32>,
) -> Result<()> {
    let order_subtotal_cents = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT subtotal_cents
        FROM orders
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await?;

    let Some(order_subtotal_cents) = order_subtotal_cents else {
        bail!("Order {order_id} does not exist.");
    };

    if status != "Captured" {
        return Ok(());
    }

    let captured_total_cents = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(SUM(amount_cents), 0)
        FROM payments
        WHERE order_id = $1
          AND status = 'Captured'
          AND ($2::integer IS NULL OR id <> $2)
        "#,
    )
    .bind(order_id)
    .bind(excluding_payment_id)
    .fetch_one(&mut **tx)
    .await?;

    let next_total = captured_total_cents + i64::from(amount_cents);
    if next_total > i64::from(order_subtotal_cents) {
        bail!("Captured payments cannot exceed the order subtotal.");
    }

    Ok(())
}

fn validate_role_input(name: &str) -> Result<()> {
    if name.is_empty() {
        bail!("Role name is required.");
    }

    if name.eq_ignore_ascii_case("Super Admin") {
        bail!("Super Admin is reserved and cannot be recreated.");
    }

    Ok(())
}

fn validate_customer_portal_input(
    customer_name: &str,
    customer_email: &str,
    membership_tier: &str,
    points_balance: i32,
    lifetime_purchase_cents: i32,
    total_orders: i32,
) -> Result<()> {
    if customer_name.is_empty() || customer_email.is_empty() || membership_tier.is_empty() {
        bail!("Customer name, email and membership tier are required.");
    }

    if !customer_email.contains('@') {
        bail!("Customer email must be a valid address.");
    }

    if points_balance < 0 {
        bail!("Points balance must be zero or greater.");
    }

    if lifetime_purchase_cents < 0 {
        bail!("Lifetime purchase value must be zero or greater.");
    }

    if total_orders < 0 {
        bail!("Total orders must be zero or greater.");
    }

    Ok(())
}

async fn ensure_role_is_editable(pool: &PgPool, role_id: i32) -> Result<()> {
    let role = sqlx::query_as::<_, (bool,)>(
        r#"
        SELECT is_super_admin
        FROM roles
        WHERE id = $1
        "#,
    )
    .bind(role_id)
    .fetch_optional(pool)
    .await?;

    let Some((is_super_admin,)) = role else {
        bail!("Role does not exist.");
    };

    if is_super_admin {
        bail!("Super Admin is reserved and always has full access.");
    }

    Ok(())
}

fn normalize_permission_flags(input: &UpdateRolePagePermissionInput) -> (bool, bool, bool, bool) {
    let can_read = input.can_read || input.can_create || input.can_update || input.can_delete;

    (
        can_read && input.can_create,
        can_read,
        can_read && input.can_update,
        can_read && input.can_delete,
    )
}

#[cfg(test)]
mod payment_tests {
    use super::*;

    fn create_payment_input() -> CreatePaymentInput {
        CreatePaymentInput {
            order_id: 42,
            idempotency_key: "pay-42-capture-1".to_string(),
            amount_cents: 12_500,
            method: "  Card  ".to_string(),
            status: "captured".to_string(),
            reference: "  ch_123  ".to_string(),
            notes: "  Terminal approved  ".to_string(),
        }
    }

    fn existing_payment() -> Payment {
        Payment {
            id: 7,
            order_id: 42,
            order_customer_name: "Falcon Builders".to_string(),
            order_customer_email: "ap@falconbuilders.com".to_string(),
            order_subtotal_cents: 12_500,
            idempotency_key: "pay-42-capture-1".to_string(),
            amount_cents: 12_500,
            method: "Card".to_string(),
            status: "Captured".to_string(),
            reference: "ch_123".to_string(),
            notes: "Terminal approved".to_string(),
            processed_at: Some("2026-07-01 08:30:00+00".to_string()),
            created_at: "2026-07-01 08:30:00+00".to_string(),
            updated_at: "2026-07-01 08:30:00+00".to_string(),
        }
    }

    #[test]
    fn create_payment_normalization_trims_and_normalizes_status() {
        let normalized = normalize_create_payment_input(&create_payment_input()).unwrap();

        assert_eq!(normalized.method, "Card");
        assert_eq!(normalized.status, "Captured");
        assert_eq!(normalized.reference, "ch_123");
        assert_eq!(normalized.notes, "Terminal approved");
    }

    #[test]
    fn idempotent_payment_accepts_identical_replay() {
        let normalized = normalize_create_payment_input(&create_payment_input()).unwrap();

        assert!(payment_matches_create_input(
            &existing_payment(),
            &normalized
        ));
    }

    #[test]
    fn idempotent_payment_rejects_payload_drift() {
        let mut input = create_payment_input();
        input.amount_cents = 9_500;
        let normalized = normalize_create_payment_input(&input).unwrap();

        assert!(!payment_matches_create_input(
            &existing_payment(),
            &normalized
        ));
    }

    #[test]
    fn payment_validation_requires_idempotency_key() {
        let mut input = create_payment_input();
        input.idempotency_key = " ".to_string();

        let error = normalize_create_payment_input(&input).unwrap_err();

        assert!(error.to_string().contains("Idempotency key"));
    }
}

#[cfg(test)]
mod permission_tests {
    use super::*;

    fn permission_input(
        can_create: bool,
        can_read: bool,
        can_update: bool,
        can_delete: bool,
    ) -> UpdateRolePagePermissionInput {
        UpdateRolePagePermissionInput {
            role_id: 2,
            page_id: 7,
            can_create,
            can_read,
            can_update,
            can_delete,
        }
    }

    #[test]
    fn permission_write_grants_force_read_access() {
        let input = permission_input(true, false, true, true);

        assert_eq!(normalize_permission_flags(&input), (true, true, true, true));
    }

    #[test]
    fn permission_without_read_or_writes_blocks_page_access() {
        let input = permission_input(false, false, false, false);

        assert_eq!(
            normalize_permission_flags(&input),
            (false, false, false, false)
        );
    }
}

#[cfg(test)]
mod order_and_customer_tests {
    use super::*;
    use crate::models::CreateOrderItemInput;

    fn order_input(customer_name: &str, customer_email: &str) -> CreateOrderInput {
        CreateOrderInput {
            customer_name: customer_name.to_string(),
            customer_email: customer_email.to_string(),
            items: vec![CreateOrderItemInput {
                product_id: 1,
                quantity: 2,
            }],
        }
    }

    #[test]
    fn validate_order_input_accepts_trimmed_customer_details() {
        let input = order_input("  Falcon Builders  ", "  ap@falconbuilders.com  ");

        let (customer_name, customer_email) = validate_order_input(&input).unwrap();

        assert_eq!(customer_name, "Falcon Builders");
        assert_eq!(customer_email, "ap@falconbuilders.com");
    }

    #[test]
    fn validate_order_input_requires_at_least_one_item() {
        let mut input = order_input("Falcon Builders", "ap@falconbuilders.com");
        input.items.clear();

        let error = validate_order_input(&input).unwrap_err();

        assert!(error.to_string().contains("at least one item"));
    }

    #[test]
    fn customer_portal_validation_rejects_negative_balances() {
        let result = validate_customer_portal_input(
            "Dana Whitfield",
            "dana.w@example.com",
            "Gold",
            -1,
            64_900,
            1,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Points balance"));
    }

    #[test]
    fn customer_portal_validation_accepts_membership_points_and_purchases() {
        let result = validate_customer_portal_input(
            "Falcon Builders",
            "ap@falconbuilders.com",
            "Pro Xtra",
            1_840,
            184_000,
            3,
        );

        assert!(result.is_ok());
    }
}
