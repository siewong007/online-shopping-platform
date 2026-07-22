use crate::db::settings::{compute_tax_and_total, fetch_setting_int};
use crate::models::*;
use anyhow::{Result, bail};
use sqlx::{PgPool, Postgres, Transaction};

// `fulfilled` is reachable directly from `confirmed`/`processing` (not just `paid`) because
// the fulfillment flow (order_fulfillment_history) can legitimately reach a terminal fulfillment
// state before payment is recorded — this is the single source of truth both call sites use;
// see `advance_sales_status_for_fulfillment` below.
const SALES_TRANSITIONS: &[(&str, &[&str])] = &[
    ("confirmed", &["processing", "fulfilled", "cancelled"]),
    ("processing", &["paid", "fulfilled", "cancelled"]),
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

/// Advances `order_sales_meta.status` from within an already-open transaction, validating the
/// move against the same `SALES_TRANSITIONS` table `update_sales_status` uses. Unlike
/// `update_sales_status`, this never touches `payment_status` — fulfillment reaching a terminal
/// state must never be mistaken for a payment event. No-ops if the sale is already terminal or
/// has no meta row yet (defensive; `create_order` always inserts one).
pub async fn advance_sales_status_for_fulfillment(
    tx: &mut Transaction<'_, Postgres>,
    order_id: i32,
    to_status: &str,
    note: &str,
) -> Result<()> {
    let current_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT status
        FROM order_sales_meta
        WHERE order_id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await?;

    let Some(from_status) = current_status else {
        return Ok(());
    };

    if matches!(from_status.as_str(), "fulfilled" | "cancelled") {
        return Ok(());
    }

    ensure_valid_sales_transition(&from_status, to_status)?;

    sqlx::query(
        r#"
        UPDATE order_sales_meta
        SET status = $1, updated_at = now()
        WHERE order_id = $2
        "#,
    )
    .bind(to_status)
    .bind(order_id)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO sales_status_history (order_id, from_status, to_status, note)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(order_id)
    .bind(&from_status)
    .bind(to_status)
    .bind(note)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Mirror of `advance_sales_status_for_fulfillment` for the reverse direction: cancelling a sale
/// also cancels its fulfillment, so the two pipelines can't end up in contradictory terminal
/// states (e.g. `delivered` + `cancelled`). No-ops if fulfillment is already terminal.
async fn cancel_fulfillment_for_sale(
    tx: &mut Transaction<'_, Postgres>,
    order_id: i32,
    changed_by: &str,
) -> Result<()> {
    let current_status = sqlx::query_scalar::<_, String>(
        r#"
        SELECT fulfillment_status
        FROM orders
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await?;

    let Some(from_status) = current_status else {
        return Ok(());
    };

    if matches!(from_status.as_str(), "completed" | "delivered" | "canceled") {
        return Ok(());
    }

    sqlx::query(
        r#"
        UPDATE orders
        SET fulfillment_status = 'canceled'
        WHERE id = $1
        "#,
    )
    .bind(order_id)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO order_fulfillment_history (order_id, from_status, to_status, note, changed_by)
        VALUES ($1, $2, 'canceled', 'Sale was cancelled.', $3)
        "#,
    )
    .bind(order_id)
    .bind(&from_status)
    .bind(changed_by)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn fetch_sales(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<SalesRecord>> {
    let rows = match before {
        Some(before_id) => {
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
                WHERE orders.id < $1
                ORDER BY orders.id DESC
                LIMIT $2
                "#,
            )
            .bind(before_id)
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        None => {
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
                ORDER BY orders.id DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(rows)
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

    let tax_rate_bps = fetch_setting_int(pool, "sales.default_tax_rate_bps", 0).await?;
    let mut tx = pool.begin().await?;

    let subtotal_cents = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT subtotal_cents
        FROM orders
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Order {order_id} does not exist."))?;

    let shipping_cents = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(shipping_cents, 0)
        FROM order_sales_meta
        WHERE order_id = $1
        FOR UPDATE
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await?
    .unwrap_or(0);

    let offer_discount_cents = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(SUM(discount_snapshot_cents), 0)::bigint
        FROM order_offer_redemptions
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_one(&mut *tx)
    .await?;
    let maximum_manual_discount_cents = (i64::from(subtotal_cents) - offer_discount_cents).max(0);

    if i64::from(input.discount_cents) > maximum_manual_discount_cents {
        bail!("Discount cannot exceed the order subtotal after applied offers.");
    }

    let discount_cents = i32::try_from(offer_discount_cents + i64::from(input.discount_cents))
        .map_err(|_| anyhow::anyhow!("Discount exceeds the supported maximum."))?;
    let (tax_cents, merchandise_total_cents) =
        compute_tax_and_total(subtotal_cents, discount_cents, tax_rate_bps);
    let total_cents = merchandise_total_cents
        .checked_add(shipping_cents)
        .ok_or_else(|| anyhow::anyhow!("Order total exceeds the supported maximum."))?;

    sqlx::query(
        r#"
        INSERT INTO order_sales_meta
            (order_id, channel, sales_rep, discount_cents, tax_cents, total_cents, manual_discount_cents)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (order_id) DO UPDATE SET
            channel = EXCLUDED.channel,
            sales_rep = EXCLUDED.sales_rep,
            discount_cents = EXCLUDED.discount_cents,
            tax_cents = EXCLUDED.tax_cents,
            total_cents = EXCLUDED.total_cents,
            manual_discount_cents = EXCLUDED.manual_discount_cents,
            updated_at = now()
        "#,
    )
    .bind(order_id)
    .bind(channel)
    .bind(input.sales_rep.trim())
    .bind(discount_cents)
    .bind(tax_cents)
    .bind(total_cents)
    .bind(input.discount_cents)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    fetch_sales_record(pool, order_id).await
}

pub async fn update_sales_status(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesStatusInput,
    changed_by: &str,
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

    if to_status == "cancelled" {
        cancel_fulfillment_for_sale(&mut tx, order_id, changed_by).await?;
    }

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
