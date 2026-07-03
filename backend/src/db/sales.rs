use crate::db::settings::{compute_tax_and_total, fetch_setting_int};
use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;

const SALES_TRANSITIONS: &[(&str, &[&str])] = &[
    ("confirmed", &["processing", "cancelled"]),
    ("processing", &["paid", "cancelled"]),
    ("paid", &["fulfilled", "cancelled"]),
    ("fulfilled", &[]),
    ("cancelled", &[]),
];

const SALES_STATUSES: &[&str] = &["confirmed", "processing", "paid", "fulfilled", "cancelled"];

fn ensure_valid_sales_transition(from: &str, to: &str) -> Result<()> {
    let allowed = SALES_TRANSITIONS
        .iter()
        .find(|(status, _)| *status == from)
        .map(|(_, next)| *next)
        .unwrap_or(&[]);

    if !allowed.contains(&to) {
        bail!("Cannot move a sale from {from} to {to}.");
    }

    Ok(())
}

pub async fn fetch_sales(pool: &PgPool) -> Result<Vec<SalesRecord>> {
    sqlx::query_as::<_, SalesRecord>(
        r#"
        SELECT
            orders.id AS order_id,
            orders.customer_name,
            orders.customer_email,
            orders.subtotal_cents,
            COALESCE(meta.status, 'confirmed') AS status,
            COALESCE(meta.payment_status, 'unpaid') AS payment_status,
            COALESCE(meta.channel, 'web') AS channel,
            COALESCE(meta.sales_rep, '') AS sales_rep,
            COALESCE(meta.discount_cents, 0) AS discount_cents,
            COALESCE(meta.tax_cents, 0) AS tax_cents,
            COALESCE(meta.total_cents, orders.subtotal_cents) AS total_cents,
            orders.created_at::text AS created_at,
            COALESCE(meta.updated_at, orders.created_at)::text AS updated_at
        FROM orders
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
        ORDER BY orders.created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

async fn fetch_sales_record(pool: &PgPool, order_id: i32) -> Result<SalesRecord> {
    sqlx::query_as::<_, SalesRecord>(
        r#"
        SELECT
            orders.id AS order_id,
            orders.customer_name,
            orders.customer_email,
            orders.subtotal_cents,
            COALESCE(meta.status, 'confirmed') AS status,
            COALESCE(meta.payment_status, 'unpaid') AS payment_status,
            COALESCE(meta.channel, 'web') AS channel,
            COALESCE(meta.sales_rep, '') AS sales_rep,
            COALESCE(meta.discount_cents, 0) AS discount_cents,
            COALESCE(meta.tax_cents, 0) AS tax_cents,
            COALESCE(meta.total_cents, orders.subtotal_cents) AS total_cents,
            orders.created_at::text AS created_at,
            COALESCE(meta.updated_at, orders.created_at)::text AS updated_at
        FROM orders
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
        WHERE orders.id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Order {order_id} does not exist."))
}

pub async fn update_sales_details(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesDetailsInput,
) -> Result<SalesRecord> {
    let channel = input.channel.trim();
    if channel.is_empty() {
        bail!("Sales channel is required.");
    }

    if input.discount_cents < 0 {
        bail!("Discount must be zero or greater.");
    }

    let subtotal_cents = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT subtotal_cents
        FROM orders
        WHERE id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Order {order_id} does not exist."))?;

    if input.discount_cents > subtotal_cents {
        bail!("Discount cannot exceed the order subtotal.");
    }

    let tax_rate_bps = fetch_setting_int(pool, "sales.default_tax_rate_bps", 0).await?;
    let (tax_cents, total_cents) =
        compute_tax_and_total(subtotal_cents, input.discount_cents, tax_rate_bps);

    sqlx::query(
        r#"
        INSERT INTO order_sales_meta (order_id, channel, sales_rep, discount_cents, tax_cents, total_cents)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (order_id) DO UPDATE SET
            channel = EXCLUDED.channel,
            sales_rep = EXCLUDED.sales_rep,
            discount_cents = EXCLUDED.discount_cents,
            tax_cents = EXCLUDED.tax_cents,
            total_cents = EXCLUDED.total_cents,
            updated_at = now()
        "#,
    )
    .bind(order_id)
    .bind(channel)
    .bind(input.sales_rep.trim())
    .bind(input.discount_cents)
    .bind(tax_cents)
    .bind(total_cents)
    .execute(pool)
    .await?;

    fetch_sales_record(pool, order_id).await
}

pub async fn update_sales_status(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesStatusInput,
) -> Result<SalesRecord> {
    let to_status = input.status.trim().to_lowercase();
    if !SALES_STATUSES.contains(&to_status.as_str()) {
        bail!("Unknown sales status {to_status}.");
    }

    let mut tx = pool.begin().await?;

    let current_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT status
        FROM order_sales_meta
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Order {order_id} has no sales record."))?;

    ensure_valid_sales_transition(&current_status, &to_status)?;

    let payment_status = if matches!(to_status.as_str(), "paid" | "fulfilled") {
        "paid"
    } else {
        "unpaid"
    };

    sqlx::query(
        r#"
        UPDATE order_sales_meta
        SET status = $1, payment_status = $2, updated_at = now()
        WHERE order_id = $3
        "#,
    )
    .bind(&to_status)
    .bind(payment_status)
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO sales_status_history (order_id, from_status, to_status, note)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(order_id)
    .bind(&current_status)
    .bind(&to_status)
    .bind(input.note.trim())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    fetch_sales_record(pool, order_id).await
}

pub async fn fetch_sales_summary(pool: &PgPool) -> Result<SalesSummaryPayload> {
    let by_status = sqlx::query_as::<_, SalesStatusCount>(
        r#"
        SELECT
            COALESCE(meta.status, 'confirmed') AS status,
            COUNT(*) AS count,
            COALESCE(SUM(COALESCE(meta.total_cents, orders.subtotal_cents)), 0) AS total_cents
        FROM orders
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
        GROUP BY COALESCE(meta.status, 'confirmed')
        "#,
    )
    .fetch_all(pool)
    .await?;

    let by_channel = sqlx::query_as::<_, SalesChannelCount>(
        r#"
        SELECT
            COALESCE(meta.channel, 'web') AS channel,
            COUNT(*) AS count,
            COALESCE(SUM(COALESCE(meta.total_cents, orders.subtotal_cents)), 0) AS total_cents
        FROM orders
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
        GROUP BY COALESCE(meta.channel, 'web')
        "#,
    )
    .fetch_all(pool)
    .await?;

    let total_revenue_cents = by_status
        .iter()
        .filter(|row| row.status != "cancelled")
        .map(|row| row.total_cents)
        .sum();

    let order_count = by_status.iter().map(|row| row.count).sum();

    Ok(SalesSummaryPayload {
        total_revenue_cents,
        order_count,
        by_status,
        by_channel,
    })
}
