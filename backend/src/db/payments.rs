use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    sqlx::query_as::<_, Payment>(
        r#"
        SELECT payments.id,
               payments.order_id,
               orders.customer_name AS order_customer_name,
               orders.customer_email AS order_customer_email,
               COALESCE(meta.total_cents, orders.subtotal_cents) AS order_subtotal_cents,
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
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
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
               COALESCE(meta.total_cents, orders.subtotal_cents) AS order_subtotal_cents,
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
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
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
               COALESCE(meta.total_cents, orders.subtotal_cents) AS order_subtotal_cents,
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
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
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
               COALESCE(meta.total_cents, orders.subtotal_cents) AS order_subtotal_cents,
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
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GatewayPaymentStatus {
    Pending,
    Captured,
    Failed,
}

#[derive(Debug, Clone)]
pub struct VerifiedGatewayPaymentEvent<'a> {
    pub provider: &'a str,
    pub event_key: &'a str,
    pub provider_order_id: &'a str,
    pub provider_request_id: &'a str,
    pub provider_payment_id: &'a str,
    pub amount_cents: i32,
    pub currency: &'a str,
    pub status: GatewayPaymentStatus,
    pub message: &'a str,
    pub payload_sha256: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GatewayEventOutcome {
    Applied,
    Duplicate,
}

#[derive(Debug, Clone)]
pub struct GatewayPaymentRecord {
    pub payment_id: i32,
    pub order_id: i32,
    pub provider: String,
    pub provider_order_id: String,
    pub provider_request_id: String,
    pub provider_payment_id: String,
    pub amount_cents: i32,
    pub amount_refunded_cents: i32,
    pub currency: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct GatewayRefundPreparation {
    pub refund_id: i64,
    pub payment: GatewayPaymentRecord,
    pub amount_cents: i32,
    pub currency: String,
    pub existing_status: Option<String>,
    pub existing_provider_refund_id: String,
}

fn gateway_idempotency_key(provider: &str, provider_order_id: &str) -> Result<String> {
    let provider = provider.trim().to_ascii_lowercase();
    let provider_order_id = provider_order_id.trim();
    if provider.is_empty()
        || provider.len() > 32
        || !provider
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        bail!("Payment provider identifier is invalid.");
    }
    if provider_order_id.is_empty() || provider_order_id.len() > 96 {
        bail!("Provider order reference is invalid.");
    }
    Ok(format!("{provider}:{provider_order_id}"))
}

/// Creates or re-opens one gateway payment record for an order. Provider + provider order ID is
/// the idempotency key, so retries cannot create duplicate receivables across gateway adapters.
pub async fn begin_gateway_payment(
    pool: &PgPool,
    provider: &str,
    order_id: i32,
    provider_order_id: &str,
    amount_cents: i32,
) -> Result<()> {
    begin_gateway_payment_with_currency(
        pool,
        provider,
        order_id,
        provider_order_id,
        amount_cents,
        "MYR",
    )
    .await
}

pub async fn begin_gateway_payment_with_currency(
    pool: &PgPool,
    provider: &str,
    order_id: i32,
    provider_order_id: &str,
    amount_cents: i32,
    currency: &str,
) -> Result<()> {
    let provider = provider.trim().to_ascii_lowercase();
    let provider_order_id = provider_order_id.trim();
    let currency = normalize_gateway_currency(currency)?;
    let idempotency_key = gateway_idempotency_key(&provider, provider_order_id)?;
    let mut tx = pool.begin().await?;

    let existing = sqlx::query_as::<_, (i32, i32, String, String)>(
        r#"
        SELECT id, amount_cents, status, currency
        FROM payments
        WHERE idempotency_key = $1
        FOR UPDATE
        "#,
    )
    .bind(&idempotency_key)
    .fetch_optional(&mut *tx)
    .await?;

    if let Some((_, existing_amount_cents, status, existing_currency)) = existing {
        if existing_amount_cents != amount_cents || existing_currency != currency {
            bail!("Payment amount or currency no longer matches the order total.");
        }
        if matches!(status.as_str(), "Captured" | "Refunded") {
            bail!("This order has already been paid.");
        }

        sqlx::query(
            r#"
            UPDATE payments
            SET status = 'Pending', reference = $1, notes = '', processed_at = NULL,
                provider = $2, provider_order_id = $1, currency = $3, updated_at = now()
            WHERE idempotency_key = $4
            "#,
        )
        .bind(provider_order_id)
        .bind(&provider)
        .bind(&currency)
        .bind(&idempotency_key)
        .execute(&mut *tx)
        .await?;
    } else {
        let total_cents = sqlx::query_scalar::<_, i32>(
            r#"
            SELECT COALESCE(meta.total_cents, orders.subtotal_cents)
            FROM orders
            LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
            WHERE orders.id = $1
            FOR UPDATE OF orders
            "#,
        )
        .bind(order_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Order {order_id} does not exist."))?;

        if total_cents != amount_cents {
            bail!("Payment amount no longer matches the order total.");
        }

        sqlx::query(
            r#"
            INSERT INTO payments
                (order_id, idempotency_key, amount_cents, method, status, reference, notes,
                 provider, provider_order_id, currency)
            VALUES ($1, $2, $3, $4, 'Pending', $5, '', $4, $5, $6)
            "#,
        )
        .bind(order_id)
        .bind(&idempotency_key)
        .bind(amount_cents)
        .bind(&provider)
        .bind(provider_order_id)
        .bind(&currency)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn bind_gateway_payment_request(
    pool: &PgPool,
    provider: &str,
    provider_order_id: &str,
    provider_request_id: &str,
    amount_cents: i32,
    currency: &str,
) -> Result<()> {
    let provider = provider.trim().to_ascii_lowercase();
    let provider_request_id = provider_request_id.trim();
    if provider_request_id.is_empty() || provider_request_id.len() > 128 {
        bail!("Provider payment request identifier is invalid.");
    }
    let currency = normalize_gateway_currency(currency)?;
    let idempotency_key = gateway_idempotency_key(&provider, provider_order_id)?;
    let result = sqlx::query(
        r#"
        UPDATE payments
        SET provider_request_id = $1, updated_at = now()
        WHERE idempotency_key = $2
          AND amount_cents = $3
          AND currency = $4
          AND (provider_request_id = '' OR provider_request_id = $1)
        "#,
    )
    .bind(provider_request_id)
    .bind(idempotency_key)
    .bind(amount_cents)
    .bind(currency)
    .execute(pool)
    .await?;
    if result.rows_affected() != 1 {
        bail!("Gateway payment request does not match the pending payment.");
    }
    Ok(())
}

/// Applies a verified gateway notification. The caller must authenticate the provider signature
/// before calling this. Repeated callbacks are deliberately harmless.
pub async fn apply_gateway_payment_event(
    pool: &PgPool,
    provider: &str,
    provider_order_id: &str,
    status: GatewayPaymentStatus,
    transaction_id: &str,
    message: &str,
) -> Result<()> {
    let idempotency_key = gateway_idempotency_key(provider, provider_order_id)?;
    let mut tx = pool.begin().await?;

    let (payment_id, order_id, current_status) = sqlx::query_as::<_, (i32, i32, String)>(
        r#"
        SELECT id, order_id, status
        FROM payments
        WHERE idempotency_key = $1
        FOR UPDATE
        "#,
    )
    .bind(&idempotency_key)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Unknown payment gateway order reference."))?;

    match status {
        GatewayPaymentStatus::Captured => {
            if current_status != "Captured" {
                sqlx::query(
                    r#"
                    UPDATE payments
                    SET status = 'Captured', reference = $1, notes = $2, processed_at = now(), updated_at = now()
                    WHERE id = $3
                    "#,
                )
                .bind(transaction_id)
                .bind(message)
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;

                sqlx::query(
                    r#"
                    UPDATE order_sales_meta
                    SET payment_status = 'paid', updated_at = now()
                    WHERE order_id = $1
                    "#,
                )
                .bind(order_id)
                .execute(&mut *tx)
                .await?;
            }
        }
        GatewayPaymentStatus::Failed => {
            if current_status != "Captured" {
                sqlx::query(
                    r#"
                    UPDATE payments
                    SET status = 'Failed', reference = $1, notes = $2, processed_at = now(), updated_at = now()
                    WHERE id = $3
                    "#,
                )
                .bind(transaction_id)
                .bind(message)
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;
            }
        }
        GatewayPaymentStatus::Pending => {
            if current_status != "Captured" {
                sqlx::query(
                    r#"
                    UPDATE payments
                    SET status = 'Pending', reference = $1, notes = $2, updated_at = now()
                    WHERE id = $3
                    "#,
                )
                .bind(transaction_id)
                .bind(message)
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;
            }
        }
    }

    tx.commit().await?;
    Ok(())
}

/// Applies one already-authenticated provider event. Every provider identifier and all monetary
/// fields are checked against the pending ledger row before any payment, order or stock mutation.
pub async fn apply_verified_gateway_payment_event(
    pool: &PgPool,
    event: &VerifiedGatewayPaymentEvent<'_>,
) -> Result<GatewayEventOutcome> {
    let provider = event.provider.trim().to_ascii_lowercase();
    let currency = normalize_gateway_currency(event.currency)?;
    if event.event_key.trim().is_empty() || event.event_key.len() > 256 {
        bail!("Gateway event identifier is invalid.");
    }
    if event.provider_request_id.trim().is_empty()
        || event.provider_order_id.trim().is_empty()
        || event.amount_cents <= 0
    {
        bail!("Gateway event identifiers or amount are invalid.");
    }
    if event.status == GatewayPaymentStatus::Captured && event.provider_payment_id.trim().is_empty()
    {
        bail!("Captured gateway event is missing its payment identifier.");
    }

    let mut tx = pool.begin().await?;
    let row = sqlx::query_as::<_, (i32, i32, String, String, String, i32, String, String)>(
        r#"
        SELECT id, order_id, provider_order_id, provider_request_id,
               provider_payment_id, amount_cents, currency, status
        FROM payments
        WHERE provider = $1 AND provider_request_id = $2
        FOR UPDATE
        "#,
    )
    .bind(&provider)
    .bind(event.provider_request_id.trim())
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Unknown gateway payment request identifier."))?;

    let (
        payment_id,
        order_id,
        expected_order_id,
        expected_request_id,
        existing_payment_id,
        expected_amount_cents,
        expected_currency,
        current_status,
    ) = row;

    if expected_order_id != event.provider_order_id.trim()
        || expected_request_id != event.provider_request_id.trim()
    {
        bail!("Gateway event reference does not match the payment.");
    }
    if expected_amount_cents != event.amount_cents {
        bail!("Gateway event amount does not match the payment.");
    }
    if expected_currency != currency {
        bail!("Gateway event currency does not match the payment.");
    }
    if !existing_payment_id.is_empty()
        && existing_payment_id != event.provider_payment_id.trim()
        && !(current_status == "Failed" && event.status == GatewayPaymentStatus::Captured)
        && !(matches!(current_status.as_str(), "Captured" | "Refunded")
            && event.status != GatewayPaymentStatus::Captured)
    {
        bail!("Gateway event payment identifier does not match the payment.");
    }

    let duplicate = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM payment_gateway_events WHERE provider = $1 AND event_key = $2",
    )
    .bind(&provider)
    .bind(event.event_key.trim())
    .fetch_one(&mut *tx)
    .await?
        > 0;
    if duplicate {
        tx.commit().await?;
        return Ok(GatewayEventOutcome::Duplicate);
    }

    let mut outcome = "ignored-terminal";
    match event.status {
        GatewayPaymentStatus::Captured => {
            if current_status != "Captured" && current_status != "Refunded" {
                let stock_note = resolve_late_paid_stock(&mut tx, order_id, payment_id).await?;
                let notes = if stock_note.is_empty() {
                    event.message.trim().to_string()
                } else if event.message.trim().is_empty() {
                    stock_note
                } else {
                    format!("{} {stock_note}", event.message.trim())
                };
                sqlx::query(
                    r#"
                    UPDATE payments
                    SET status = 'Captured', provider_payment_id = $1, reference = $1,
                        notes = $2, processed_at = now(), updated_at = now()
                    WHERE id = $3
                    "#,
                )
                .bind(event.provider_payment_id.trim())
                .bind(notes)
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;
                sqlx::query(
                    "UPDATE order_sales_meta SET payment_status = 'paid', updated_at = now() WHERE order_id = $1",
                )
                .bind(order_id)
                .execute(&mut *tx)
                .await?;
                outcome = "captured";
            }
        }
        GatewayPaymentStatus::Failed => {
            if current_status != "Captured" && current_status != "Refunded" {
                release_unpaid_order_stock(&mut tx, order_id).await?;
                sqlx::query(
                    r#"
                    UPDATE payments
                    SET status = 'Failed', provider_payment_id = CASE WHEN $1 = '' THEN provider_payment_id ELSE $1 END,
                        reference = $1, notes = $2, processed_at = now(), updated_at = now()
                    WHERE id = $3
                    "#,
                )
                .bind(event.provider_payment_id.trim())
                .bind(event.message.trim())
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;
                outcome = "failed-stock-released";
            }
        }
        GatewayPaymentStatus::Pending => {
            if current_status != "Captured" && current_status != "Refunded" {
                sqlx::query(
                    "UPDATE payments SET status = 'Pending', notes = $1, updated_at = now() WHERE id = $2",
                )
                .bind(event.message.trim())
                .bind(payment_id)
                .execute(&mut *tx)
                .await?;
                outcome = "pending";
            }
        }
    }

    sqlx::query(
        r#"
        INSERT INTO payment_gateway_events
            (payment_id, provider, event_key, provider_request_id, provider_payment_id,
             event_status, payload_sha256, outcome)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(payment_id)
    .bind(&provider)
    .bind(event.event_key.trim())
    .bind(event.provider_request_id.trim())
    .bind(event.provider_payment_id.trim())
    .bind(match event.status {
        GatewayPaymentStatus::Pending => "Pending",
        GatewayPaymentStatus::Captured => "Captured",
        GatewayPaymentStatus::Failed => "Failed",
    })
    .bind(event.payload_sha256.trim())
    .bind(outcome)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(GatewayEventOutcome::Applied)
}

pub async fn fetch_gateway_payment(pool: &PgPool, payment_id: i32) -> Result<GatewayPaymentRecord> {
    sqlx::query_as::<
        _,
        (
            i32,
            i32,
            String,
            String,
            String,
            String,
            i32,
            i32,
            String,
            String,
        ),
    >(
        r#"
        SELECT id, order_id, provider, provider_order_id, provider_request_id,
               provider_payment_id, amount_cents, amount_refunded_cents, currency, status
        FROM payments WHERE id = $1
        "#,
    )
    .bind(payment_id)
    .fetch_optional(pool)
    .await?
    .map(|row| GatewayPaymentRecord {
        payment_id: row.0,
        order_id: row.1,
        provider: row.2,
        provider_order_id: row.3,
        provider_request_id: row.4,
        provider_payment_id: row.5,
        amount_cents: row.6,
        amount_refunded_cents: row.7,
        currency: row.8,
        status: row.9,
    })
    .ok_or_else(|| anyhow::anyhow!("Payment {payment_id} does not exist."))
}

pub async fn prepare_gateway_refund(
    pool: &PgPool,
    payment_id: i32,
    provider: &str,
    requested_amount_cents: Option<i32>,
    idempotency_key: &str,
    requested_by: &str,
) -> Result<GatewayRefundPreparation> {
    let provider = provider.trim().to_ascii_lowercase();
    let idempotency_key = idempotency_key.trim();
    if idempotency_key.is_empty() || idempotency_key.len() > 128 {
        bail!("Refund idempotency key is required and must be 128 characters or fewer.");
    }
    let mut tx = pool.begin().await?;
    let row = sqlx::query_as::<
        _,
        (
            i32,
            i32,
            String,
            String,
            String,
            String,
            i32,
            i32,
            String,
            String,
        ),
    >(
        r#"
        SELECT id, order_id, provider, provider_order_id, provider_request_id,
               provider_payment_id, amount_cents, amount_refunded_cents, currency, status
        FROM payments WHERE id = $1 FOR UPDATE
        "#,
    )
    .bind(payment_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Payment {payment_id} does not exist."))?;
    let payment = GatewayPaymentRecord {
        payment_id: row.0,
        order_id: row.1,
        provider: row.2,
        provider_order_id: row.3,
        provider_request_id: row.4,
        provider_payment_id: row.5,
        amount_cents: row.6,
        amount_refunded_cents: row.7,
        currency: row.8,
        status: row.9,
    };
    if payment.provider != provider || payment.provider_payment_id.is_empty() {
        bail!("Payment is not a refundable transaction for this provider.");
    }
    if payment.status != "Captured" && payment.status != "Refunded" {
        bail!("Only a captured payment can be refunded.");
    }
    let existing = sqlx::query_as::<_, (i64, i32, String, String)>(
        r#"
        SELECT id, amount_cents, status, provider_refund_id
        FROM payment_refunds
        WHERE provider = $1 AND idempotency_key = $2
        FOR UPDATE
        "#,
    )
    .bind(&provider)
    .bind(idempotency_key)
    .fetch_optional(&mut *tx)
    .await?;
    if let Some((refund_id, existing_amount, status, provider_refund_id)) = existing {
        if requested_amount_cents.is_some_and(|amount| amount != existing_amount) {
            bail!("Refund idempotency key is already associated with a different amount.");
        }
        tx.commit().await?;
        return Ok(GatewayRefundPreparation {
            refund_id,
            currency: payment.currency.clone(),
            payment,
            amount_cents: existing_amount,
            existing_status: Some(status),
            existing_provider_refund_id: provider_refund_id,
        });
    }

    let remaining = payment.amount_cents - payment.amount_refunded_cents;
    let amount_cents = requested_amount_cents.unwrap_or(remaining);
    if amount_cents <= 0 || amount_cents > remaining {
        bail!("Refund amount exceeds the refundable payment balance.");
    }

    let refund_id = sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO payment_refunds
            (payment_id, provider, idempotency_key, amount_cents, currency, status, requested_by)
        VALUES ($1, $2, $3, $4, $5, 'Pending', $6)
        RETURNING id
        "#,
    )
    .bind(payment_id)
    .bind(&provider)
    .bind(idempotency_key)
    .bind(amount_cents)
    .bind(&payment.currency)
    .bind(requested_by.trim())
    .fetch_one(&mut *tx)
    .await?;
    let currency = payment.currency.clone();
    tx.commit().await?;
    Ok(GatewayRefundPreparation {
        refund_id,
        payment,
        amount_cents,
        currency,
        existing_status: None,
        existing_provider_refund_id: String::new(),
    })
}

pub async fn complete_gateway_refund(
    pool: &PgPool,
    refund_id: i64,
    provider_refund_id: &str,
    provider_payment_id: &str,
    amount_cents: i32,
    currency: &str,
) -> Result<()> {
    let mut tx = pool.begin().await?;
    let (payment_id, expected_amount, expected_currency, refund_status) =
        sqlx::query_as::<_, (i32, i32, String, String)>(
            "SELECT payment_id, amount_cents, currency, status FROM payment_refunds WHERE id = $1 FOR UPDATE",
        )
        .bind(refund_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Unknown refund request."))?;
    if refund_status == "Succeeded" {
        tx.commit().await?;
        return Ok(());
    }
    if refund_status != "Pending" {
        bail!("Refund is not pending and cannot be completed.");
    }
    let (expected_payment_id, paid_cents, refunded_cents) =
        sqlx::query_as::<_, (String, i32, i32)>(
            "SELECT provider_payment_id, amount_cents, amount_refunded_cents FROM payments WHERE id = $1 FOR UPDATE",
        )
        .bind(payment_id)
        .fetch_one(&mut *tx)
        .await?;
    if provider_refund_id.trim().is_empty()
        || expected_payment_id != provider_payment_id.trim()
        || expected_amount != amount_cents
        || expected_currency != normalize_gateway_currency(currency)?
    {
        bail!("Refund response does not match the requested payment, amount or currency.");
    }
    let next_refunded = refunded_cents
        .checked_add(amount_cents)
        .ok_or_else(|| anyhow::anyhow!("Refund total exceeds the supported maximum."))?;
    if next_refunded > paid_cents {
        bail!("Refund response exceeds the captured payment amount.");
    }
    sqlx::query(
        "UPDATE payment_refunds SET provider_refund_id = $1, status = 'Succeeded', updated_at = now() WHERE id = $2",
    )
    .bind(provider_refund_id.trim())
    .bind(refund_id)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        r#"
        UPDATE payments
        SET amount_refunded_cents = $1,
            status = CASE WHEN $1 = amount_cents THEN 'Refunded' ELSE 'Captured' END,
            updated_at = now()
        WHERE id = $2
        "#,
    )
    .bind(next_refunded)
    .bind(payment_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(())
}

pub async fn fail_gateway_refund(
    pool: &PgPool,
    refund_id: i64,
    failure_reason: &str,
    uncertain: bool,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE payment_refunds
        SET status = $1, failure_reason = $2, updated_at = now()
        WHERE id = $3 AND status = 'Pending'
        "#,
    )
    .bind(if uncertain { "Unknown" } else { "Failed" })
    .bind(failure_reason.trim())
    .bind(refund_id)
    .execute(pool)
    .await?;
    Ok(())
}

fn normalize_gateway_currency(currency: &str) -> Result<String> {
    let currency = currency.trim().to_ascii_uppercase();
    if currency.len() != 3 || !currency.bytes().all(|byte| byte.is_ascii_uppercase()) {
        bail!("Payment currency is invalid.");
    }
    Ok(currency)
}

async fn release_unpaid_order_stock(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    order_id: i32,
) -> Result<bool> {
    let eligible = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT orders.stock_released_at IS NULL
               AND orders.fulfillment_status = 'received'
               AND meta.payment_status = 'unpaid'
        FROM orders
        JOIN order_sales_meta meta ON meta.order_id = orders.id
        WHERE orders.id = $1
        FOR UPDATE OF orders
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await?
    .unwrap_or(false);
    if !eligible {
        return Ok(false);
    }
    sqlx::query(
        r#"
        UPDATE products
        SET stock_quantity = products.stock_quantity + quantities.quantity
        FROM (
            SELECT product_id, SUM(quantity)::integer AS quantity
            FROM order_items WHERE order_id = $1 GROUP BY product_id
        ) quantities
        WHERE products.id = quantities.product_id
        "#,
    )
    .bind(order_id)
    .execute(&mut **tx)
    .await?;
    sqlx::query("UPDATE orders SET stock_released_at = now() WHERE id = $1")
        .bind(order_id)
        .execute(&mut **tx)
        .await?;
    Ok(true)
}

async fn resolve_late_paid_stock(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    order_id: i32,
    payment_id: i32,
) -> Result<String> {
    let released = sqlx::query_scalar::<_, bool>(
        "SELECT stock_released_at IS NOT NULL FROM orders WHERE id = $1 FOR UPDATE",
    )
    .bind(order_id)
    .fetch_one(&mut **tx)
    .await?;
    if !released {
        return Ok(String::new());
    }
    let quantities = sqlx::query_as::<_, (i32, i64)>(
        "SELECT product_id, SUM(quantity) FROM order_items WHERE order_id = $1 GROUP BY product_id ORDER BY product_id",
    )
    .bind(order_id)
    .fetch_all(&mut **tx)
    .await?;
    let mut sufficient = true;
    for (product_id, quantity) in &quantities {
        let stock = sqlx::query_scalar::<_, i32>(
            "SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE",
        )
        .bind(product_id)
        .fetch_one(&mut **tx)
        .await?;
        if i64::from(stock) < *quantity {
            sufficient = false;
        }
    }
    if sufficient {
        for (product_id, quantity) in quantities {
            let quantity = i32::try_from(quantity)
                .map_err(|_| anyhow::anyhow!("Order quantity exceeds the supported maximum."))?;
            sqlx::query("UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2")
                .bind(quantity)
                .bind(product_id)
                .execute(&mut **tx)
                .await?;
        }
        sqlx::query(
            "UPDATE orders SET stock_released_at = NULL, stock_reacquired_at = now() WHERE id = $1",
        )
        .bind(order_id)
        .execute(&mut **tx)
        .await?;
        Ok("Stock was safely re-reserved after this late payment.".to_string())
    } else {
        sqlx::query(
            r#"
            INSERT INTO payment_stock_exceptions (order_id, payment_id, kind, details)
            VALUES ($1, $2, 'late-payment-stock-shortfall',
                    'Valid payment arrived after stock release, but one or more items are no longer available. Manual resolution is required.')
            ON CONFLICT (payment_id, kind) DO NOTHING
            "#,
        )
        .bind(order_id)
        .bind(payment_id)
        .execute(&mut **tx)
        .await?;
        Ok("PAID STOCK EXCEPTION: stock had been released and could not be re-reserved; manual resolution is required.".to_string())
    }
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
    let order_total_cents = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(meta.total_cents, orders.subtotal_cents)
        FROM orders
        LEFT JOIN order_sales_meta meta ON meta.order_id = orders.id
        WHERE orders.id = $1
        FOR UPDATE OF orders
        "#,
    )
    .bind(order_id)
    .fetch_optional(&mut **tx)
    .await?;

    let Some(order_total_cents) = order_total_cents else {
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
    if next_total > i64::from(order_total_cents) {
        bail!("Captured payments cannot exceed the order total.");
    }

    Ok(())
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

    #[test]
    fn gateway_keys_isolate_provider_namespaces() {
        assert_eq!(
            gateway_idempotency_key("hitpay", "EKW-42").unwrap(),
            "hitpay:EKW-42"
        );
        assert_eq!(
            gateway_idempotency_key("senangpay", "EKW-42").unwrap(),
            "senangpay:EKW-42"
        );
        assert!(gateway_idempotency_key("bad/provider", "EKW-42").is_err());
    }
}
