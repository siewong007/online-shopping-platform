use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;
use std::collections::HashMap;

pub async fn fetch_customer_portal_profiles(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<CustomerPortalProfile>> {
    let rows = match before {
        Some(before_id) => {
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
                ORDER BY id DESC
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

pub async fn verify_customer_order_ownership(
    pool: &PgPool,
    email: &str,
    order_id: i32,
) -> Result<bool> {
    let email = email.trim();
    let owns_order = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM orders
            WHERE id = $1 AND lower(customer_email) = lower($2)
        )
        "#,
    )
    .bind(order_id)
    .bind(email)
    .fetch_one(pool)
    .await?;

    Ok(owns_order)
}

pub async fn lookup_customer_portal(pool: &PgPool, email: &str) -> Result<CustomerLookupPayload> {
    let email = email.trim();
    let profile = sqlx::query_as::<_, CustomerLookupProfile>(
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
        WHERE lower(customer_email) = lower($1)
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    let order_rows = sqlx::query_as::<_, (i32, i32, String, String)>(
        r#"
        SELECT
            id,
            subtotal_cents,
            fulfillment_status,
            created_at::text AS created_at
        FROM orders
        WHERE lower(customer_email) = lower($1)
        ORDER BY created_at DESC, id DESC
        LIMIT 20
        "#,
    )
    .bind(email)
    .fetch_all(pool)
    .await?;

    let order_ids = order_rows.iter().map(|(id, ..)| *id).collect::<Vec<_>>();
    let item_rows = if order_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, (i32, String, i32, i32)>(
            r#"
            SELECT order_id, product_name, unit_price_cents, quantity
            FROM order_items
            WHERE order_id = ANY($1)
            ORDER BY order_id, id
            "#,
        )
        .bind(order_ids.as_slice())
        .fetch_all(pool)
        .await?
    };

    let mut items_by_order: HashMap<i32, Vec<CustomerLookupOrderItem>> = HashMap::new();
    for (order_id, product_name, unit_price_cents, quantity) in item_rows {
        items_by_order
            .entry(order_id)
            .or_default()
            .push(CustomerLookupOrderItem {
                product_name,
                unit_price_cents,
                quantity,
            });
    }

    let orders = order_rows
        .into_iter()
        .map(
            |(id, subtotal_cents, fulfillment_status, created_at)| CustomerLookupOrder {
                id,
                subtotal_cents,
                fulfillment_status,
                created_at,
                items: items_by_order.remove(&id).unwrap_or_default(),
            },
        )
        .collect();

    Ok(CustomerLookupPayload { profile, orders })
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

#[cfg(test)]
mod customer_portal_tests {
    use super::*;

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
