use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;

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

    let live_metrics = fetch_live_dashboard_metrics(pool).await?;

    Ok(AdminDashboardPayload {
        metrics,
        live_metrics,
        inventory,
        fulfillment,
        campaigns,
        activity,
    })
}

/// Computes the live KPI figures for the Overview tab in a single round trip.
/// Low-stock counts are intentionally omitted until real inventory (§3) lands —
/// the frontend renders only the cards it receives rather than faking a number.
pub async fn fetch_live_dashboard_metrics(pool: &PgPool) -> Result<LiveDashboardMetrics> {
    let metrics = sqlx::query_as::<_, LiveDashboardMetrics>(
        r#"
        SELECT
            COALESCE((
                SELECT SUM(COALESCE(meta.total_cents, orders.subtotal_cents))
                FROM orders
                LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
                WHERE orders.created_at::date = current_date
                  AND COALESCE(meta.status, 'confirmed') <> 'cancelled'
            ), 0)::bigint AS revenue_today_cents,
            COALESCE((
                SELECT SUM(COALESCE(meta.total_cents, orders.subtotal_cents))
                FROM orders
                LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
                WHERE orders.created_at::date = current_date - 1
                  AND COALESCE(meta.status, 'confirmed') <> 'cancelled'
            ), 0)::bigint AS revenue_yesterday_cents,
            (
                SELECT COUNT(*)
                FROM orders
                WHERE fulfillment_status NOT IN ('completed', 'delivered', 'canceled')
            )::bigint AS orders_awaiting_fulfillment,
            (
                SELECT COUNT(*)
                FROM invoices i
                WHERE i.voided_at IS NULL
                  AND i.total_cents > COALESCE((
                      SELECT SUM(p.amount_cents) FROM invoice_payments p WHERE p.invoice_id = i.id
                  ), 0)
            )::bigint AS unpaid_invoice_count,
            COALESCE((
                SELECT SUM(i.total_cents - COALESCE((
                    SELECT SUM(p.amount_cents) FROM invoice_payments p WHERE p.invoice_id = i.id
                ), 0))
                FROM invoices i
                WHERE i.voided_at IS NULL
                  AND i.total_cents > COALESCE((
                      SELECT SUM(p.amount_cents) FROM invoice_payments p WHERE p.invoice_id = i.id
                  ), 0)
            ), 0)::bigint AS unpaid_invoice_amount_cents
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok(metrics)
}
