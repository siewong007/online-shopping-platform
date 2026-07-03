use crate::db::orders::fetch_order_by_id;
use crate::db::settings::{compute_tax_and_total, fetch_setting_int};
use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;
use std::collections::HashMap;

#[derive(sqlx::FromRow)]
struct InvoiceRow {
    id: i32,
    invoice_number: String,
    order_id: i32,
    billing_name: String,
    billing_email: String,
    billing_address: String,
    subtotal_cents: i32,
    discount_cents: i32,
    tax_cents: i32,
    total_cents: i32,
    issued_at: String,
    due_at: String,
    voided_at: Option<String>,
    is_overdue: bool,
}

const INVOICE_ROW_SELECT: &str = r#"
    SELECT id, invoice_number, order_id, billing_name, billing_email, billing_address,
           subtotal_cents, discount_cents, tax_cents, total_cents,
           issued_at::text AS issued_at, due_at::text AS due_at,
           voided_at::text AS voided_at,
           (voided_at IS NULL AND due_at < now()) AS is_overdue
    FROM invoices
"#;

fn derive_invoice_status(
    voided_at: &Option<String>,
    is_overdue: bool,
    total_cents: i32,
    amount_paid_cents: i32,
) -> String {
    if voided_at.is_some() {
        return "void".to_string();
    }

    if total_cents > 0 && amount_paid_cents >= total_cents {
        return "paid".to_string();
    }

    if amount_paid_cents > 0 {
        return "partial".to_string();
    }

    if is_overdue {
        return "overdue".to_string();
    }

    "unpaid".to_string()
}

async fn allocate_invoice_number(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> Result<String> {
    let prefix = sqlx::query_scalar::<_, String>(
        r#"
        SELECT value
        FROM system_settings
        WHERE key = 'invoicing.number_prefix'
        "#,
    )
    .fetch_optional(&mut **tx)
    .await?
    .unwrap_or_else(|| "INV-".to_string());

    let sequence = sqlx::query_scalar::<_, i32>(
        r#"
        UPDATE system_settings
        SET value = (value::int + 1)::text, updated_at = now()
        WHERE key = 'invoicing.next_sequence'
        RETURNING (value::int - 1)
        "#,
    )
    .fetch_optional(&mut **tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Invoice sequence setting is missing."))?;

    Ok(format!("{prefix}{sequence:06}"))
}

pub async fn create_invoice_from_order(
    pool: &PgPool,
    order_id: i32,
    input: &CreateInvoiceFromOrderInput,
) -> Result<Invoice> {
    let order = fetch_order_by_id(pool, order_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Order {order_id} does not exist."))?;

    let already_invoiced = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT id
        FROM invoices
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?;

    if already_invoiced.is_some() {
        bail!("Order {order_id} already has an invoice.");
    }

    let discount_cents = input.discount_cents.unwrap_or(0);
    if discount_cents < 0 || discount_cents > order.subtotal_cents {
        bail!("Discount must be between zero and the order subtotal.");
    }

    let tax_rate_bps = fetch_setting_int(pool, "sales.default_tax_rate_bps", 0).await?;
    let (tax_cents, total_cents) =
        compute_tax_and_total(order.subtotal_cents, discount_cents, tax_rate_bps);
    let payment_terms_days = fetch_setting_int(pool, "invoicing.payment_terms_days", 30).await?;

    let mut tx = pool.begin().await?;

    let invoice_number = allocate_invoice_number(&mut tx).await?;

    let row = sqlx::query_as::<_, InvoiceRow>(
        r#"
        INSERT INTO invoices (
            invoice_number, order_id, billing_name, billing_email, billing_address,
            subtotal_cents, discount_cents, tax_cents, total_cents, due_at
        )
        VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8, now() + make_interval(days => $9))
        RETURNING id, invoice_number, order_id, billing_name, billing_email, billing_address,
                  subtotal_cents, discount_cents, tax_cents, total_cents,
                  issued_at::text AS issued_at, due_at::text AS due_at,
                  voided_at::text AS voided_at,
                  (voided_at IS NULL AND due_at < now()) AS is_overdue
        "#,
    )
    .bind(&invoice_number)
    .bind(order_id)
    .bind(&order.customer_name)
    .bind(&order.customer_email)
    .bind(order.subtotal_cents)
    .bind(discount_cents)
    .bind(tax_cents)
    .bind(total_cents)
    .bind(payment_terms_days)
    .fetch_one(&mut *tx)
    .await?;

    for item in &order.items {
        sqlx::query(
            r#"
            INSERT INTO invoice_line_items (invoice_id, product_id, product_name, unit_price_cents, quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(row.id)
        .bind(item.product_id)
        .bind(&item.product_name)
        .bind(item.unit_price_cents)
        .bind(item.quantity)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(Invoice {
        id: row.id,
        invoice_number: row.invoice_number,
        order_id: row.order_id,
        status: derive_invoice_status(&row.voided_at, row.is_overdue, row.total_cents, 0),
        billing_name: row.billing_name,
        billing_email: row.billing_email,
        billing_address: row.billing_address,
        subtotal_cents: row.subtotal_cents,
        discount_cents: row.discount_cents,
        tax_cents: row.tax_cents,
        total_cents: row.total_cents,
        amount_paid_cents: 0,
        issued_at: row.issued_at,
        due_at: row.due_at,
        voided_at: row.voided_at,
        line_items: order
            .items
            .iter()
            .map(|item| InvoiceLineItem {
                product_id: item.product_id,
                product_name: item.product_name.clone(),
                unit_price_cents: item.unit_price_cents,
                quantity: item.quantity,
            })
            .collect(),
        payments: Vec::new(),
    })
}

pub async fn fetch_invoices(pool: &PgPool) -> Result<Vec<Invoice>> {
    let query = format!("{INVOICE_ROW_SELECT} ORDER BY issued_at DESC");
    let rows = sqlx::query_as::<_, InvoiceRow>(&query)
        .fetch_all(pool)
        .await?;

    let line_item_rows = sqlx::query_as::<_, (i32, i32, String, i32, i32)>(
        r#"
        SELECT invoice_id, product_id, product_name, unit_price_cents, quantity
        FROM invoice_line_items
        ORDER BY invoice_id, id
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut line_items_by_invoice: HashMap<i32, Vec<InvoiceLineItem>> = HashMap::new();
    for (invoice_id, product_id, product_name, unit_price_cents, quantity) in line_item_rows {
        line_items_by_invoice
            .entry(invoice_id)
            .or_default()
            .push(InvoiceLineItem {
                product_id,
                product_name,
                unit_price_cents,
                quantity,
            });
    }

    let payment_rows = sqlx::query_as::<_, (i32, i32, i32, String, String, String)>(
        r#"
        SELECT invoice_id, id, amount_cents, method, paid_at::text AS paid_at, note
        FROM invoice_payments
        ORDER BY invoice_id, paid_at
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut payments_by_invoice: HashMap<i32, Vec<InvoicePayment>> = HashMap::new();
    for (invoice_id, id, amount_cents, method, paid_at, note) in payment_rows {
        payments_by_invoice
            .entry(invoice_id)
            .or_default()
            .push(InvoicePayment {
                id,
                amount_cents,
                method,
                paid_at,
                note,
            });
    }

    Ok(rows
        .into_iter()
        .map(|row| {
            let line_items = line_items_by_invoice.remove(&row.id).unwrap_or_default();
            let payments = payments_by_invoice.remove(&row.id).unwrap_or_default();
            let amount_paid_cents: i32 = payments.iter().map(|payment| payment.amount_cents).sum();
            let status = derive_invoice_status(
                &row.voided_at,
                row.is_overdue,
                row.total_cents,
                amount_paid_cents,
            );

            Invoice {
                id: row.id,
                invoice_number: row.invoice_number,
                order_id: row.order_id,
                status,
                billing_name: row.billing_name,
                billing_email: row.billing_email,
                billing_address: row.billing_address,
                subtotal_cents: row.subtotal_cents,
                discount_cents: row.discount_cents,
                tax_cents: row.tax_cents,
                total_cents: row.total_cents,
                amount_paid_cents,
                issued_at: row.issued_at,
                due_at: row.due_at,
                voided_at: row.voided_at,
                line_items,
                payments,
            }
        })
        .collect())
}

async fn fetch_invoice_by_id(pool: &PgPool, invoice_id: i32) -> Result<Invoice> {
    let query = format!("{INVOICE_ROW_SELECT} WHERE id = $1");
    let row = sqlx::query_as::<_, InvoiceRow>(&query)
        .bind(invoice_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Invoice {invoice_id} does not exist."))?;

    let line_items = sqlx::query_as::<_, InvoiceLineItem>(
        r#"
        SELECT product_id, product_name, unit_price_cents, quantity
        FROM invoice_line_items
        WHERE invoice_id = $1
        ORDER BY id
        "#,
    )
    .bind(invoice_id)
    .fetch_all(pool)
    .await?;

    let payments = sqlx::query_as::<_, InvoicePayment>(
        r#"
        SELECT id, amount_cents, method, paid_at::text AS paid_at, note
        FROM invoice_payments
        WHERE invoice_id = $1
        ORDER BY paid_at
        "#,
    )
    .bind(invoice_id)
    .fetch_all(pool)
    .await?;

    let amount_paid_cents: i32 = payments.iter().map(|payment| payment.amount_cents).sum();
    let status = derive_invoice_status(
        &row.voided_at,
        row.is_overdue,
        row.total_cents,
        amount_paid_cents,
    );

    Ok(Invoice {
        id: row.id,
        invoice_number: row.invoice_number,
        order_id: row.order_id,
        status,
        billing_name: row.billing_name,
        billing_email: row.billing_email,
        billing_address: row.billing_address,
        subtotal_cents: row.subtotal_cents,
        discount_cents: row.discount_cents,
        tax_cents: row.tax_cents,
        total_cents: row.total_cents,
        amount_paid_cents,
        issued_at: row.issued_at,
        due_at: row.due_at,
        voided_at: row.voided_at,
        line_items,
        payments,
    })
}

pub async fn update_invoice_billing(
    pool: &PgPool,
    invoice_id: i32,
    input: &UpdateInvoiceBillingInput,
) -> Result<Invoice> {
    let updated = sqlx::query_scalar::<_, i32>(
        r#"
        UPDATE invoices
        SET billing_address = $1, updated_at = now()
        WHERE id = $2
        RETURNING id
        "#,
    )
    .bind(input.billing_address.trim())
    .bind(invoice_id)
    .fetch_optional(pool)
    .await?;

    if updated.is_none() {
        bail!("Invoice {invoice_id} does not exist.");
    }

    fetch_invoice_by_id(pool, invoice_id).await
}

pub async fn void_invoice(pool: &PgPool, invoice_id: i32) -> Result<Invoice> {
    let amount_paid: i64 = sqlx::query_scalar::<_, Option<i64>>(
        r#"
        SELECT SUM(amount_cents)::bigint
        FROM invoice_payments
        WHERE invoice_id = $1
        "#,
    )
    .bind(invoice_id)
    .fetch_one(pool)
    .await?
    .unwrap_or(0);

    if amount_paid > 0 {
        bail!("Cannot void an invoice that already has payments recorded.");
    }

    let updated = sqlx::query_scalar::<_, i32>(
        r#"
        UPDATE invoices
        SET voided_at = now(), updated_at = now()
        WHERE id = $1 AND voided_at IS NULL
        RETURNING id
        "#,
    )
    .bind(invoice_id)
    .fetch_optional(pool)
    .await?;

    if updated.is_none() {
        bail!("Invoice {invoice_id} does not exist or is already void.");
    }

    fetch_invoice_by_id(pool, invoice_id).await
}

pub async fn record_invoice_payment(
    pool: &PgPool,
    invoice_id: i32,
    input: &RecordInvoicePaymentInput,
) -> Result<Invoice> {
    if input.amount_cents <= 0 {
        bail!("Payment amount must be greater than zero.");
    }

    let method = input.method.trim();
    if method.is_empty() {
        bail!("Payment method is required.");
    }

    let mut tx = pool.begin().await?;

    let invoice = sqlx::query_as::<_, (i32, Option<String>)>(
        r#"
        SELECT total_cents, voided_at::text
        FROM invoices
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(invoice_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((total_cents, voided_at)) = invoice else {
        bail!("Invoice {invoice_id} does not exist.");
    };

    if voided_at.is_some() {
        bail!("Cannot record a payment against a voided invoice.");
    }

    let amount_paid: i64 = sqlx::query_scalar::<_, Option<i64>>(
        r#"
        SELECT SUM(amount_cents)::bigint
        FROM invoice_payments
        WHERE invoice_id = $1
        "#,
    )
    .bind(invoice_id)
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0);

    let remaining = i64::from(total_cents) - amount_paid;
    if i64::from(input.amount_cents) > remaining {
        bail!("Payment exceeds the remaining balance of {remaining} cents.");
    }

    sqlx::query(
        r#"
        INSERT INTO invoice_payments (invoice_id, amount_cents, method, note)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(invoice_id)
    .bind(input.amount_cents)
    .bind(method)
    .bind(input.note.trim())
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE invoices SET updated_at = now() WHERE id = $1
        "#,
    )
    .bind(invoice_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    fetch_invoice_by_id(pool, invoice_id).await
}
