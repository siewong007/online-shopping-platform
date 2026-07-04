use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;
use std::collections::HashMap;

pub async fn create_customer_account(
    pool: &PgPool,
    email: &str,
    password_hash: &str,
    display_name: &str,
) -> Result<CustomerAccount> {
    let email = email.trim();
    let display_name = display_name.trim();

    if email.is_empty() || display_name.is_empty() {
        bail!("Email and display name are required.");
    }

    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(SELECT 1 FROM customer_accounts WHERE lower(email) = lower($1))
        "#,
    )
    .bind(email)
    .fetch_one(pool)
    .await?;

    if exists {
        bail!("Unable to register.");
    }

    sqlx::query_as::<_, CustomerAccount>(
        r#"
        INSERT INTO customer_accounts (email, password_hash, display_name)
        VALUES ($1, $2, $3)
        RETURNING id, email, display_name, created_at::text AS created_at, updated_at::text AS updated_at
        "#,
    )
    .bind(email)
    .bind(password_hash)
    .bind(display_name)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_customer_account_by_email(
    pool: &PgPool,
    email: &str,
) -> Result<Option<CustomerAccountCredentials>> {
    sqlx::query_as::<_, CustomerAccountCredentials>(
        r#"
        SELECT id, email, password_hash, display_name,
               created_at::text AS created_at, updated_at::text AS updated_at
        FROM customer_accounts
        WHERE lower(email) = lower($1)
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn insert_customer_session(
    pool: &PgPool,
    customer_account_id: i32,
    token: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO customer_sessions (token, customer_account_id, expires_at)
        VALUES ($1, $2, now() + interval '30 days')
        "#,
    )
    .bind(token)
    .bind(customer_account_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_customer_session(pool: &PgPool, token: &str) -> Result<()> {
    sqlx::query(
        r#"
        DELETE FROM customer_sessions
        WHERE token = $1
        "#,
    )
    .bind(token)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn authenticate_customer_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<CustomerIdentity>> {
    sqlx::query_as::<_, CustomerIdentity>(
        r#"
        SELECT customer_accounts.id AS customer_account_id,
               customer_accounts.email,
               customer_accounts.display_name
        FROM customer_sessions
        JOIN customer_accounts ON customer_accounts.id = customer_sessions.customer_account_id
        WHERE customer_sessions.token = $1
          AND customer_sessions.expires_at > now()
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn link_portal_profile_to_account(
    pool: &PgPool,
    customer_account_id: i32,
    email: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE customer_portal_profiles
        SET customer_account_id = $1
        WHERE lower(customer_email) = lower($2)
          AND customer_account_id IS NULL
        "#,
    )
    .bind(customer_account_id)
    .bind(email)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn fetch_customer_me(
    pool: &PgPool,
    customer_account_id: i32,
) -> Result<CustomerMePayload> {
    let account = sqlx::query_as::<_, CustomerAccount>(
        r#"
        SELECT id, email, display_name, created_at::text AS created_at, updated_at::text AS updated_at
        FROM customer_accounts
        WHERE id = $1
        "#,
    )
    .bind(customer_account_id)
    .fetch_one(pool)
    .await?;

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
        WHERE customer_account_id = $1
        "#,
    )
    .bind(customer_account_id)
    .fetch_optional(pool)
    .await?;

    let order_rows = sqlx::query_as::<_, (i32, i32, String, String)>(
        r#"
        SELECT id, subtotal_cents, fulfillment_status, created_at::text AS created_at
        FROM orders
        WHERE customer_account_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 20
        "#,
    )
    .bind(customer_account_id)
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

    Ok(CustomerMePayload {
        account,
        profile,
        orders,
    })
}
