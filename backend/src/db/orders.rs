use crate::db::sales::advance_sales_status_for_fulfillment;
use crate::db::settings::{compute_tax_and_total, fetch_setting_int};
use crate::models::*;
use anyhow::{Result, anyhow, bail};
use sqlx::{PgConnection, PgPool};
use std::collections::HashMap;

const FULFILLMENT_METHODS: &[&str] = &["pickup", "delivery"];
const FULFILLMENT_STATUSES: &[&str] = &[
    "received",
    "picking",
    "packed",
    "ready_for_pickup",
    "out_for_delivery",
    "completed",
    "delivered",
    "canceled",
];
const FULFILLMENT_PICKUP_TRANSITIONS: &[(&str, &[&str])] = &[
    ("received", &["picking", "canceled"]),
    ("picking", &["packed", "canceled"]),
    ("packed", &["ready_for_pickup", "canceled"]),
    ("ready_for_pickup", &["completed", "canceled"]),
    ("completed", &[]),
    ("canceled", &[]),
];
const FULFILLMENT_DELIVERY_TRANSITIONS: &[(&str, &[&str])] = &[
    ("received", &["picking", "canceled"]),
    ("picking", &["packed", "canceled"]),
    ("packed", &["out_for_delivery", "canceled"]),
    ("out_for_delivery", &["delivered", "canceled"]),
    ("delivered", &[]),
    ("canceled", &[]),
];

fn normalize_fulfillment_method(method: Option<&str>) -> Result<String> {
    let method = method.unwrap_or("pickup").trim().to_lowercase();

    if !FULFILLMENT_METHODS.contains(&method.as_str()) {
        bail!("Unknown fulfillment method {method}.");
    }

    Ok(method)
}

fn ensure_fulfillment_status_matches_method(status: &str, method: &str) -> Result<()> {
    let valid_for_method = match method {
        "pickup" => !matches!(status, "out_for_delivery" | "delivered"),
        "delivery" => !matches!(status, "ready_for_pickup" | "completed"),
        _ => false,
    };

    if !valid_for_method {
        bail!("Fulfillment status {status} is not valid for {method} orders.");
    }

    Ok(())
}

fn ensure_valid_fulfillment_transition(from: &str, to: &str, method: &str) -> Result<()> {
    let transitions = match method {
        "pickup" => FULFILLMENT_PICKUP_TRANSITIONS,
        "delivery" => FULFILLMENT_DELIVERY_TRANSITIONS,
        _ => &[][..],
    };
    let allowed = transitions
        .iter()
        .find(|(status, _)| *status == from)
        .map(|(_, next)| *next)
        .unwrap_or(&[]);

    if !allowed.contains(&to) {
        bail!("Cannot move from {from} to {to}.");
    }

    Ok(())
}

pub async fn create_order(
    pool: &PgPool,
    input: &CreateOrderInput,
    customer_account_id: Option<i32>,
) -> Result<Order> {
    let (customer_name, customer_email) = validate_order_input(input)?;
    let fulfillment_method = normalize_fulfillment_method(input.fulfillment_method.as_deref())?;

    let mut tx = pool.begin().await?;

    let (subtotal_cents, line_items) =
        resolve_order_line_items(&mut tx, input, DecrementStock::Yes).await?;

    let (order_id, fulfillment_status, fulfillment_method, created_at) =
        sqlx::query_as::<_, (i32, String, String, String)>(
            r#"
        INSERT INTO orders (customer_name, customer_email, subtotal_cents, fulfillment_method, customer_account_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, fulfillment_status, fulfillment_method, created_at::text
        "#,
        )
        .bind(customer_name)
        .bind(customer_email)
        .bind(subtotal_cents)
        .bind(&fulfillment_method)
        .bind(customer_account_id)
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

    let customer_portal_email = customer_email.to_lowercase();
    let earned_points = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT FLOOR(($1::numeric / 100) * COALESCE((
            SELECT membership_tiers.points_multiplier
            FROM customer_portal_profiles
            JOIN membership_tiers ON membership_tiers.name = customer_portal_profiles.membership_tier
            WHERE customer_portal_profiles.customer_email = $2
            LIMIT 1
        ), 1.00))::int
        "#,
    )
    .bind(subtotal_cents)
    .bind(&customer_portal_email)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO customer_portal_profiles
            (customer_name, customer_email, membership_tier, points_balance, lifetime_purchase_cents, total_orders, last_purchase_at, customer_account_id)
        VALUES ($1, $2, 'Bronze', $3, $4, 1, $5::timestamptz, $6)
        ON CONFLICT (customer_email) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            points_balance = customer_portal_profiles.points_balance + EXCLUDED.points_balance,
            lifetime_purchase_cents = customer_portal_profiles.lifetime_purchase_cents + EXCLUDED.lifetime_purchase_cents,
            total_orders = customer_portal_profiles.total_orders + 1,
            last_purchase_at = EXCLUDED.last_purchase_at,
            customer_account_id = COALESCE(customer_portal_profiles.customer_account_id, EXCLUDED.customer_account_id),
            updated_at = now()
        "#,
    )
    .bind(customer_name)
    .bind(customer_portal_email)
    .bind(earned_points)
    .bind(subtotal_cents)
    .bind(&created_at)
    .bind(customer_account_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Order {
        id: order_id,
        customer_name: customer_name.to_string(),
        customer_email: customer_email.to_string(),
        subtotal_cents,
        fulfillment_status,
        fulfillment_method,
        created_at,
        items: line_items,
        fulfillment_history: Vec::new(),
    })
}

pub async fn fetch_orders(pool: &PgPool, limit: i64, before: Option<i32>) -> Result<Vec<Order>> {
    let orders = match before {
        Some(before_id) => {
            sqlx::query_as::<_, (i32, String, String, i32, String, String, String)>(
                r#"
                SELECT
                    id,
                    customer_name,
                    customer_email,
                    subtotal_cents,
                    fulfillment_status,
                    fulfillment_method,
                    created_at::text
                FROM orders
                WHERE id < $1
                ORDER BY id DESC
                LIMIT $2
                "#,
            )
            .bind(before_id)
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        None => {
            sqlx::query_as::<_, (i32, String, String, i32, String, String, String)>(
                r#"
                SELECT
                    id,
                    customer_name,
                    customer_email,
                    subtotal_cents,
                    fulfillment_status,
                    fulfillment_method,
                    created_at::text
                FROM orders
                ORDER BY id DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
    };

    let order_ids = orders.iter().map(|(id, ..)| *id).collect::<Vec<_>>();
    let item_rows = if order_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, (i32, i32, String, i32, i32)>(
            r#"
            SELECT order_id, product_id, product_name, unit_price_cents, quantity
            FROM order_items
            WHERE order_id = ANY($1)
            ORDER BY order_id, id
            "#,
        )
        .bind(order_ids.as_slice())
        .fetch_all(pool)
        .await?
    };

    let mut items_by_order: HashMap<i32, Vec<OrderItem>> = HashMap::new();
    for (order_id, product_id, product_name, unit_price_cents, quantity) in item_rows {
        items_by_order.entry(order_id).or_default().push(OrderItem {
            product_id,
            product_name,
            unit_price_cents,
            quantity,
        });
    }

    let mut histories_by_order = fetch_fulfillment_histories_for_orders(pool, &order_ids).await?;

    Ok(orders
        .into_iter()
        .map(
            |(
                id,
                customer_name,
                customer_email,
                subtotal_cents,
                fulfillment_status,
                fulfillment_method,
                created_at,
            )| Order {
                id,
                customer_name,
                customer_email,
                subtotal_cents,
                fulfillment_status,
                fulfillment_method,
                created_at,
                items: items_by_order.remove(&id).unwrap_or_default(),
                fulfillment_history: histories_by_order.remove(&id).unwrap_or_default(),
            },
        )
        .collect())
}

async fn fetch_fulfillment_histories_for_orders(
    pool: &PgPool,
    order_ids: &[i32],
) -> Result<HashMap<i32, Vec<OrderFulfillmentHistory>>> {
    if order_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query_as::<_, OrderFulfillmentHistory>(
        r#"
        SELECT
            id,
            order_id,
            from_status,
            to_status,
            note,
            changed_by,
            happened_at::text AS happened_at
        FROM order_fulfillment_history
        WHERE order_id = ANY($1)
        ORDER BY order_id, happened_at, id
        "#,
    )
    .bind(order_ids)
    .fetch_all(pool)
    .await?;

    let mut histories_by_order: HashMap<i32, Vec<OrderFulfillmentHistory>> = HashMap::new();
    for row in rows {
        histories_by_order
            .entry(row.order_id)
            .or_default()
            .push(row);
    }

    Ok(histories_by_order)
}

async fn fetch_fulfillment_history_for_order(
    pool: &PgPool,
    order_id: i32,
) -> Result<Vec<OrderFulfillmentHistory>> {
    Ok(fetch_fulfillment_histories_for_orders(pool, &[order_id])
        .await?
        .remove(&order_id)
        .unwrap_or_default())
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

#[derive(Clone, Copy, PartialEq, Eq)]
enum DecrementStock {
    Yes,
    No,
}

/// Resolves order line items against `products`, computing the subtotal. When
/// `DecrementStock::Yes`, the stock check-and-decrement is a single conditional `UPDATE` so
/// concurrent checkouts can never oversell the same unit — the `WHERE stock_quantity >= $qty`
/// clause makes the decrement atomic with the check.
async fn resolve_order_line_items(
    conn: &mut PgConnection,
    input: &CreateOrderInput,
    decrement_stock: DecrementStock,
) -> Result<(i32, Vec<OrderItem>)> {
    let mut subtotal_cents: i64 = 0;
    let mut line_items: Vec<OrderItem> = Vec::with_capacity(input.items.len());

    for item in &input.items {
        if item.quantity <= 0 {
            bail!("Order item quantity must be greater than zero.");
        }

        let (product_name, unit_price_cents) = if decrement_stock == DecrementStock::Yes {
            let decremented = sqlx::query_as::<_, (String, i32)>(
                r#"
                UPDATE products
                SET stock_quantity = stock_quantity - $1
                WHERE id = $2 AND stock_quantity >= $1
                RETURNING name, price_cents
                "#,
            )
            .bind(item.quantity)
            .bind(item.product_id)
            .fetch_optional(&mut *conn)
            .await?;

            match decremented {
                Some(row) => row,
                None => {
                    let existing = sqlx::query_as::<_, (String, i32)>(
                        r#"
                        SELECT name, stock_quantity
                        FROM products
                        WHERE id = $1
                        "#,
                    )
                    .bind(item.product_id)
                    .fetch_optional(&mut *conn)
                    .await?;

                    match existing {
                        Some((name, stock_quantity)) => {
                            bail!("{name} has only {stock_quantity} left in stock.");
                        }
                        None => bail!("Product {} does not exist.", item.product_id),
                    }
                }
            }
        } else {
            let product = sqlx::query_as::<_, (String, i32)>(
                r#"
                SELECT name, price_cents
                FROM products
                WHERE id = $1
                "#,
            )
            .bind(item.product_id)
            .fetch_optional(&mut *conn)
            .await?;

            product.ok_or_else(|| anyhow!("Product {} does not exist.", item.product_id))?
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
        .map_err(|_| anyhow!("Order subtotal exceeds the supported maximum."))?;

    Ok((subtotal_cents, line_items))
}

pub async fn update_order(pool: &PgPool, order_id: i32, input: &CreateOrderInput) -> Result<Order> {
    let (customer_name, customer_email) = validate_order_input(input)?;
    let fulfillment_method = input
        .fulfillment_method
        .as_deref()
        .map(|method| normalize_fulfillment_method(Some(method)))
        .transpose()?;
    let tax_rate_bps = fetch_setting_int(pool, "sales.default_tax_rate_bps", 0).await?;
    let mut tx = pool.begin().await?;

    let current_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT fulfillment_status
        FROM orders
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(current_status) = current_status else {
        bail!("Order {order_id} does not exist.");
    };

    if matches!(
        current_status.as_str(),
        "completed" | "delivered" | "canceled"
    ) {
        bail!("Order {order_id} is {current_status} and can no longer be edited.");
    }

    let (subtotal_cents, line_items) =
        resolve_order_line_items(&mut tx, input, DecrementStock::No).await?;

    let order_state = sqlx::query_as::<_, (String, String, String)>(
        r#"
        UPDATE orders
        SET customer_name = $1,
            customer_email = $2,
            subtotal_cents = $3,
            fulfillment_method = COALESCE($4, fulfillment_method)
        WHERE id = $5
        RETURNING fulfillment_status, fulfillment_method, created_at::text
        "#,
    )
    .bind(customer_name)
    .bind(customer_email)
    .bind(subtotal_cents)
    .bind(fulfillment_method.as_deref())
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((fulfillment_status, fulfillment_method, created_at)) = order_state else {
        bail!("Order {order_id} does not exist.");
    };
    ensure_fulfillment_status_matches_method(&fulfillment_status, &fulfillment_method)?;

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
        fulfillment_status,
        fulfillment_method,
        created_at,
        items: line_items,
        fulfillment_history: fetch_fulfillment_history_for_order(pool, order_id).await?,
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

pub async fn fetch_order_by_id(pool: &PgPool, order_id: i32) -> Result<Option<Order>> {
    let order = sqlx::query_as::<_, (i32, String, String, i32, String, String, String)>(
        r#"
        SELECT
            id,
            customer_name,
            customer_email,
            subtotal_cents,
            fulfillment_status,
            fulfillment_method,
            created_at::text
        FROM orders
        WHERE id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?;

    let Some((
        id,
        customer_name,
        customer_email,
        subtotal_cents,
        fulfillment_status,
        fulfillment_method,
        created_at,
    )) = order
    else {
        return Ok(None);
    };

    let items = sqlx::query_as::<_, (i32, String, i32, i32)>(
        r#"
        SELECT product_id, product_name, unit_price_cents, quantity
        FROM order_items
        WHERE order_id = $1
        ORDER BY id
        "#,
    )
    .bind(order_id)
    .fetch_all(pool)
    .await?;

    Ok(Some(Order {
        id,
        customer_name,
        customer_email,
        subtotal_cents,
        fulfillment_status,
        fulfillment_method,
        created_at,
        items: items
            .into_iter()
            .map(
                |(product_id, product_name, unit_price_cents, quantity)| OrderItem {
                    product_id,
                    product_name,
                    unit_price_cents,
                    quantity,
                },
            )
            .collect(),
        fulfillment_history: fetch_fulfillment_history_for_order(pool, order_id).await?,
    }))
}

pub async fn update_order_fulfillment(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateOrderFulfillmentInput,
    changed_by: &str,
) -> Result<Order> {
    let to_status = input.to_status.trim().to_lowercase();
    if !FULFILLMENT_STATUSES.contains(&to_status.as_str()) {
        bail!("Unknown fulfillment status {to_status}.");
    }

    let changed_by = match changed_by.trim() {
        "" => "system",
        value => value,
    };
    let note = input.note.trim();
    let mut tx = pool.begin().await?;

    let order_state = sqlx::query_as::<_, (String, String)>(
        r#"
        SELECT fulfillment_status, fulfillment_method
        FROM orders
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((current_status, fulfillment_method)) = order_state else {
        bail!("Order {order_id} does not exist.");
    };

    ensure_fulfillment_status_matches_method(&current_status, &fulfillment_method)?;
    ensure_valid_fulfillment_transition(&current_status, &to_status, &fulfillment_method)?;

    sqlx::query(
        r#"
        UPDATE orders
        SET fulfillment_status = $1
        WHERE id = $2
        "#,
    )
    .bind(&to_status)
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO order_fulfillment_history
            (order_id, from_status, to_status, note, changed_by)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(order_id)
    .bind(&current_status)
    .bind(&to_status)
    .bind(note)
    .bind(changed_by)
    .execute(&mut *tx)
    .await?;

    if matches!(to_status.as_str(), "completed" | "delivered" | "canceled") {
        let sales_to_status = if to_status == "canceled" {
            "cancelled"
        } else {
            "fulfilled"
        };

        // payment_status is intentionally left untouched by this path: it should only ever
        // reflect an actual payment record, never be inferred from fulfillment.
        advance_sales_status_for_fulfillment(
            &mut tx,
            order_id,
            sales_to_status,
            &format!("Fulfillment moved to {to_status}."),
        )
        .await?;
    }

    tx.commit().await?;

    fetch_order_by_id(pool, order_id)
        .await?
        .ok_or_else(|| anyhow!("Order {order_id} does not exist."))
}

#[cfg(test)]
mod order_tests {
    use super::*;
    use crate::models::CreateOrderItemInput;

    fn order_input(customer_name: &str, customer_email: &str) -> CreateOrderInput {
        CreateOrderInput {
            customer_name: customer_name.to_string(),
            customer_email: customer_email.to_string(),
            fulfillment_method: None,
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
}
