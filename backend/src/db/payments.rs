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
}
