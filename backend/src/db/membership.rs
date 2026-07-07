use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;
use std::collections::HashMap;

/// The membership profile for a signed-in customer, resolved via the linked
/// portal profile (customer_account_id) rather than an email lookup.
pub async fn fetch_membership_profile(
    pool: &PgPool,
    customer_account_id: i32,
) -> Result<Option<CustomerLookupProfile>> {
    sqlx::query_as::<_, CustomerLookupProfile>(
        r#"
        SELECT
            customer_name,
            customer_email,
            membership_tier,
            points_balance,
            lifetime_purchase_cents,
            total_orders,
            last_purchase_at::text AS last_purchase_at
        FROM customer_portal_profiles
        WHERE customer_account_id = $1
        "#,
    )
    .bind(customer_account_id)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

/// All tiers ordered by rank ascending.
pub async fn fetch_membership_tiers(pool: &PgPool) -> Result<Vec<MembershipTier>> {
    sqlx::query_as::<_, MembershipTier>(
        r#"
        SELECT name, rank, min_lifetime_purchase_cents
        FROM membership_tiers
        ORDER BY rank ASC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

/// All tiers with their benefits, tiers rank ascending, benefits sort_order ascending.
pub async fn fetch_membership_tiers_with_benefits(
    pool: &PgPool,
) -> Result<Vec<MembershipTierWithBenefits>> {
    let tiers = sqlx::query_as::<_, (i32, String, i32, i32)>(
        r#"
        SELECT id, name, rank, min_lifetime_purchase_cents
        FROM membership_tiers
        ORDER BY rank ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let benefit_rows = sqlx::query_as::<_, (i32, String, Option<String>)>(
        r#"
        SELECT tier_id, title, description
        FROM membership_benefits
        ORDER BY tier_id, sort_order, id
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut benefits_by_tier: HashMap<i32, Vec<MembershipBenefit>> = HashMap::new();
    for (tier_id, title, description) in benefit_rows {
        benefits_by_tier
            .entry(tier_id)
            .or_default()
            .push(MembershipBenefit { title, description });
    }

    Ok(tiers
        .into_iter()
        .map(
            |(id, name, rank, min_lifetime_purchase_cents)| MembershipTierWithBenefits {
                name,
                rank,
                min_lifetime_purchase_cents,
                benefits: benefits_by_tier.remove(&id).unwrap_or_default(),
            },
        )
        .collect())
}

/// The customer's orders newest-first, matched strictly by linked account id —
/// email is self-chosen at registration and never ownership-verified, so matching
/// on it would leak other customers' orders and payments. Includes line items and
/// any payments recorded against each order.
pub async fn fetch_customer_transactions(
    pool: &PgPool,
    customer_account_id: i32,
    limit: i64,
    offset: i64,
) -> Result<CustomerTransactionsPayload> {
    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM orders
        WHERE customer_account_id = $1
        "#,
    )
    .bind(customer_account_id)
    .fetch_one(pool)
    .await?;

    let order_rows = sqlx::query_as::<_, (i32, String, String, i32, String)>(
        r#"
        SELECT
            id,
            created_at::text AS created_at,
            fulfillment_status,
            subtotal_cents,
            fulfillment_method
        FROM orders
        WHERE customer_account_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(customer_account_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let order_ids = order_rows.iter().map(|(id, ..)| *id).collect::<Vec<_>>();

    let (item_rows, payment_rows) = if order_ids.is_empty() {
        (Vec::new(), Vec::new())
    } else {
        let items = sqlx::query_as::<_, (i32, String, i32, i32)>(
            r#"
            SELECT order_id, product_name, quantity, unit_price_cents
            FROM order_items
            WHERE order_id = ANY($1)
            ORDER BY order_id, id
            "#,
        )
        .bind(order_ids.as_slice())
        .fetch_all(pool)
        .await?;

        let payments = sqlx::query_as::<_, (i32, String, String, i32, String, Option<String>)>(
            r#"
            SELECT order_id, method, status, amount_cents, reference,
                   processed_at::text AS processed_at
            FROM payments
            WHERE order_id = ANY($1)
            ORDER BY order_id, id
            "#,
        )
        .bind(order_ids.as_slice())
        .fetch_all(pool)
        .await?;

        (items, payments)
    };

    let mut items_by_order: HashMap<i32, Vec<CustomerTransactionItem>> = HashMap::new();
    for (order_id, product_name, quantity, unit_price_cents) in item_rows {
        items_by_order
            .entry(order_id)
            .or_default()
            .push(CustomerTransactionItem {
                product_name,
                quantity,
                unit_price_cents,
            });
    }

    let mut payments_by_order: HashMap<i32, Vec<CustomerTransactionPayment>> = HashMap::new();
    for (order_id, method, status, amount_cents, reference, processed_at) in payment_rows {
        payments_by_order
            .entry(order_id)
            .or_default()
            .push(CustomerTransactionPayment {
                method,
                status,
                amount_cents,
                reference,
                processed_at,
            });
    }

    let transactions = order_rows
        .into_iter()
        .map(
            |(id, created_at, status, subtotal_cents, fulfillment_method)| CustomerTransaction {
                id,
                created_at,
                status,
                subtotal_cents,
                fulfillment_method,
                items: items_by_order.remove(&id).unwrap_or_default(),
                payments: payments_by_order.remove(&id).unwrap_or_default(),
            },
        )
        .collect();

    Ok(CustomerTransactionsPayload {
        total,
        transactions,
    })
}
