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
    buyer_tin: Option<String>,
    buyer_registration_number: Option<String>,
    buyer_sst_registration_number: Option<String>,
    subtotal_cents: i32,
    discount_cents: i32,
    tax_cents: i32,
    total_cents: i32,
    issued_at: String,
    due_at: String,
    voided_at: Option<String>,
    exported_to_autocount_at: Option<String>,
    is_overdue: bool,
}

const INVOICE_ROW_SELECT: &str = r#"
    SELECT id, invoice_number, order_id, billing_name, billing_email, billing_address,
           buyer_tin, buyer_registration_number, buyer_sst_registration_number,
           subtotal_cents, discount_cents, tax_cents, total_cents,
           issued_at::text AS issued_at, due_at::text AS due_at,
           voided_at::text AS voided_at,
           exported_to_autocount_at::text AS exported_to_autocount_at,
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

fn compute_invoice_line_tax_cents(
    items: &[OrderItem],
    subtotal_cents: i32,
    discount_cents: i32,
    invoice_tax_cents: i32,
) -> Vec<i32> {
    let mut taxable_lines = Vec::with_capacity(items.len());
    let mut allocated_discount_cents = 0;

    for (index, item) in items.iter().enumerate() {
        let is_last = index + 1 == items.len();
        let line_subtotal_cents = i64::from(item.unit_price_cents) * i64::from(item.quantity);
        let line_discount_cents = if is_last {
            discount_cents - allocated_discount_cents
        } else if subtotal_cents > 0 {
            ((line_subtotal_cents * i64::from(discount_cents)) / i64::from(subtotal_cents)) as i32
        } else {
            0
        };
        allocated_discount_cents += line_discount_cents;
        taxable_lines.push((line_subtotal_cents - i64::from(line_discount_cents)).max(0));
    }

    let total_taxable_cents: i64 = taxable_lines.iter().sum();
    let mut taxes = Vec::with_capacity(items.len());
    let mut allocated_tax_cents = 0;

    for (index, taxable_cents) in taxable_lines.iter().enumerate() {
        let is_last = index + 1 == taxable_lines.len();
        let line_tax_cents = if is_last {
            invoice_tax_cents - allocated_tax_cents
        } else if total_taxable_cents > 0 {
            ((i64::from(invoice_tax_cents) * *taxable_cents) / total_taxable_cents) as i32
        } else {
            0
        };
        allocated_tax_cents += line_tax_cents;
        taxes.push(line_tax_cents);
    }

    taxes
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
                  buyer_tin, buyer_registration_number, buyer_sst_registration_number,
                  subtotal_cents, discount_cents, tax_cents, total_cents,
                  issued_at::text AS issued_at, due_at::text AS due_at,
                  voided_at::text AS voided_at,
                  exported_to_autocount_at::text AS exported_to_autocount_at,
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

    let line_tax_cents = compute_invoice_line_tax_cents(
        &order.items,
        order.subtotal_cents,
        discount_cents,
        tax_cents,
    );

    for (index, item) in order.items.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO invoice_line_items (
                invoice_id, product_id, product_name, unit_price_cents, quantity,
                tax_rate_bps, tax_cents
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(row.id)
        .bind(item.product_id)
        .bind(&item.product_name)
        .bind(item.unit_price_cents)
        .bind(item.quantity)
        .bind(tax_rate_bps)
        .bind(line_tax_cents[index])
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
        buyer_tin: row.buyer_tin,
        buyer_registration_number: row.buyer_registration_number,
        buyer_sst_registration_number: row.buyer_sst_registration_number,
        subtotal_cents: row.subtotal_cents,
        discount_cents: row.discount_cents,
        tax_cents: row.tax_cents,
        total_cents: row.total_cents,
        amount_paid_cents: 0,
        issued_at: row.issued_at,
        due_at: row.due_at,
        voided_at: row.voided_at,
        exported_to_autocount_at: row.exported_to_autocount_at,
        line_items: order
            .items
            .iter()
            .enumerate()
            .map(|(index, item)| InvoiceLineItem {
                product_id: item.product_id,
                product_name: item.product_name.clone(),
                unit_price_cents: item.unit_price_cents,
                quantity: item.quantity,
                tax_code: None,
                tax_rate_bps: Some(tax_rate_bps),
                tax_cents: line_tax_cents[index],
            })
            .collect(),
        payments: Vec::new(),
    })
}

pub async fn fetch_invoices(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<Invoice>> {
    let rows = match before {
        Some(before_id) => {
            let query = format!("{INVOICE_ROW_SELECT} WHERE id < $1 ORDER BY id DESC LIMIT $2");
            sqlx::query_as::<_, InvoiceRow>(&query)
                .bind(before_id)
                .bind(limit)
                .fetch_all(pool)
                .await?
        }
        None => {
            let query = format!("{INVOICE_ROW_SELECT} ORDER BY id DESC LIMIT $1");
            sqlx::query_as::<_, InvoiceRow>(&query)
                .bind(limit)
                .fetch_all(pool)
                .await?
        }
    };

    let invoice_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();

    let line_item_rows = if invoice_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, (i32, i32, String, i32, i32, Option<String>, Option<i32>, i32)>(
            r#"
            SELECT invoice_id, product_id, product_name, unit_price_cents, quantity,
                   tax_code, tax_rate_bps, tax_cents
            FROM invoice_line_items
            WHERE invoice_id = ANY($1)
            ORDER BY invoice_id, id
            "#,
        )
        .bind(invoice_ids.as_slice())
        .fetch_all(pool)
        .await?
    };

    let mut line_items_by_invoice: HashMap<i32, Vec<InvoiceLineItem>> = HashMap::new();
    for (
        invoice_id,
        product_id,
        product_name,
        unit_price_cents,
        quantity,
        tax_code,
        tax_rate_bps,
        tax_cents,
    ) in line_item_rows
    {
        line_items_by_invoice
            .entry(invoice_id)
            .or_default()
            .push(InvoiceLineItem {
                product_id,
                product_name,
                unit_price_cents,
                quantity,
                tax_code,
                tax_rate_bps,
                tax_cents,
            });
    }

    let payment_rows = if invoice_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, (i32, i32, i32, String, String, String)>(
            r#"
            SELECT invoice_id, id, amount_cents, method, paid_at::text AS paid_at, note
            FROM invoice_payments
            WHERE invoice_id = ANY($1)
            ORDER BY invoice_id, paid_at
            "#,
        )
        .bind(invoice_ids.as_slice())
        .fetch_all(pool)
        .await?
    };

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
                buyer_tin: row.buyer_tin,
                buyer_registration_number: row.buyer_registration_number,
                buyer_sst_registration_number: row.buyer_sst_registration_number,
                subtotal_cents: row.subtotal_cents,
                discount_cents: row.discount_cents,
                tax_cents: row.tax_cents,
                total_cents: row.total_cents,
                amount_paid_cents,
                issued_at: row.issued_at,
                due_at: row.due_at,
                voided_at: row.voided_at,
                exported_to_autocount_at: row.exported_to_autocount_at,
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
        SELECT product_id, product_name, unit_price_cents, quantity,
               tax_code, tax_rate_bps, tax_cents
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
        buyer_tin: row.buyer_tin,
        buyer_registration_number: row.buyer_registration_number,
        buyer_sst_registration_number: row.buyer_sst_registration_number,
        subtotal_cents: row.subtotal_cents,
        discount_cents: row.discount_cents,
        tax_cents: row.tax_cents,
        total_cents: row.total_cents,
        amount_paid_cents,
        issued_at: row.issued_at,
        due_at: row.due_at,
        voided_at: row.voided_at,
        exported_to_autocount_at: row.exported_to_autocount_at,
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
        SET billing_address = $1,
            buyer_tin = NULLIF($2, ''),
            buyer_registration_number = NULLIF($3, ''),
            buyer_sst_registration_number = NULLIF($4, ''),
            updated_at = now()
        WHERE id = $5
        RETURNING id
        "#,
    )
    .bind(input.billing_address.trim())
    .bind(input.buyer_tin.as_deref().unwrap_or("").trim())
    .bind(
        input
            .buyer_registration_number
            .as_deref()
            .unwrap_or("")
            .trim(),
    )
    .bind(
        input
            .buyer_sst_registration_number
            .as_deref()
            .unwrap_or("")
            .trim(),
    )
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

#[derive(sqlx::FromRow)]
struct AutoCountExportInvoiceRow {
    id: i32,
    invoice_number: String,
    order_id: i32,
    billing_name: String,
    billing_email: String,
    billing_address: String,
    buyer_tin: Option<String>,
    buyer_registration_number: Option<String>,
    buyer_sst_registration_number: Option<String>,
    subtotal_cents: i32,
    discount_cents: i32,
    tax_cents: i32,
    total_cents: i32,
    issued_date: String,
}

#[derive(sqlx::FromRow)]
struct AutoCountExportLineRow {
    invoice_id: i32,
    product_id: i32,
    product_name: String,
    unit_price_cents: i32,
    quantity: i32,
    tax_code: Option<String>,
    tax_rate_bps: Option<i32>,
    tax_cents: i32,
}

fn debtor_code(invoice: &AutoCountExportInvoiceRow) -> String {
    let code = invoice
        .billing_email
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .take(24)
        .collect::<String>()
        .to_ascii_uppercase();

    if code.is_empty() {
        format!("CUST{}", invoice.order_id)
    } else {
        code
    }
}

fn cents_to_decimal(cents: i32) -> String {
    let sign = if cents < 0 { "-" } else { "" };
    let absolute = cents.abs();
    format!("{sign}{}.{:02}", absolute / 100, absolute % 100)
}

fn csv_cell(value: impl AsRef<str>) -> String {
    let value = value.as_ref();
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn push_csv_row(csv: &mut String, values: &[String]) {
    csv.push_str(&values.iter().map(csv_cell).collect::<Vec<_>>().join(","));
    csv.push('\n');
}

fn build_autocount_invoice_csv(
    invoices: &[AutoCountExportInvoiceRow],
    lines_by_invoice: &mut HashMap<i32, Vec<AutoCountExportLineRow>>,
) -> String {
    let mut csv = String::new();
    push_csv_row(
        &mut csv,
        &[
            "DocumentNo".to_string(),
            "DocumentDate".to_string(),
            "DebtorCode".to_string(),
            "DebtorName".to_string(),
            "DebtorEmail".to_string(),
            "BillingAddress".to_string(),
            "BuyerTIN".to_string(),
            "BuyerRegistrationNo".to_string(),
            "BuyerSSTNo".to_string(),
            "ItemCode".to_string(),
            "Description".to_string(),
            "Quantity".to_string(),
            "UOM".to_string(),
            "UnitPrice".to_string(),
            "LineDiscount".to_string(),
            "TaxCode".to_string(),
            "TaxRatePercent".to_string(),
            "TaxAmount".to_string(),
            "LineTotal".to_string(),
            "InvoiceSubtotal".to_string(),
            "InvoiceDiscount".to_string(),
            "InvoiceTax".to_string(),
            "InvoiceTotal".to_string(),
            "PlatformInvoiceId".to_string(),
            "PlatformOrderId".to_string(),
        ],
    );

    for invoice in invoices {
        let lines = lines_by_invoice.remove(&invoice.id).unwrap_or_default();
        let mut allocated_discount_cents = 0;

        for (index, line) in lines.iter().enumerate() {
            let is_last = index + 1 == lines.len();
            let line_subtotal_cents = line.unit_price_cents * line.quantity;
            let line_discount_cents = if is_last {
                invoice.discount_cents - allocated_discount_cents
            } else if invoice.subtotal_cents > 0 {
                ((i64::from(line_subtotal_cents) * i64::from(invoice.discount_cents))
                    / i64::from(invoice.subtotal_cents)) as i32
            } else {
                0
            };
            allocated_discount_cents += line_discount_cents;
            let line_total_cents = line_subtotal_cents - line_discount_cents + line.tax_cents;
            let tax_rate = line
                .tax_rate_bps
                .map(|rate| format!("{}.{:02}", rate / 100, rate % 100))
                .unwrap_or_default();

            push_csv_row(
                &mut csv,
                &[
                    invoice.invoice_number.clone(),
                    invoice.issued_date.clone(),
                    debtor_code(invoice),
                    invoice.billing_name.clone(),
                    invoice.billing_email.clone(),
                    invoice.billing_address.clone(),
                    invoice.buyer_tin.clone().unwrap_or_default(),
                    invoice
                        .buyer_registration_number
                        .clone()
                        .unwrap_or_default(),
                    invoice
                        .buyer_sst_registration_number
                        .clone()
                        .unwrap_or_default(),
                    format!("SKU-{}", line.product_id),
                    line.product_name.clone(),
                    line.quantity.to_string(),
                    "UNIT".to_string(),
                    cents_to_decimal(line.unit_price_cents),
                    cents_to_decimal(line_discount_cents),
                    line.tax_code.clone().unwrap_or_else(|| "SST".to_string()),
                    tax_rate,
                    cents_to_decimal(line.tax_cents),
                    cents_to_decimal(line_total_cents),
                    cents_to_decimal(invoice.subtotal_cents),
                    cents_to_decimal(invoice.discount_cents),
                    cents_to_decimal(invoice.tax_cents),
                    cents_to_decimal(invoice.total_cents),
                    invoice.id.to_string(),
                    invoice.order_id.to_string(),
                ],
            );
        }
    }

    csv
}

pub async fn export_autocount_invoices(
    pool: &PgPool,
    input: &AutoCountExportInput,
) -> Result<String> {
    let include_exported = input.include_exported.unwrap_or(false);
    let mut tx = pool.begin().await?;

    let invoices = sqlx::query_as::<_, AutoCountExportInvoiceRow>(
        r#"
        SELECT id, invoice_number, order_id, billing_name, billing_email, billing_address,
               buyer_tin, buyer_registration_number, buyer_sst_registration_number,
               subtotal_cents, discount_cents, tax_cents, total_cents,
               issued_at::date::text AS issued_date
        FROM invoices
        WHERE voided_at IS NULL
          AND ($1::timestamptz IS NULL OR issued_at >= $1::timestamptz)
          AND ($2::timestamptz IS NULL OR issued_at <= $2::timestamptz)
          AND ($3::bool OR exported_to_autocount_at IS NULL)
        ORDER BY id
        FOR UPDATE
        "#,
    )
    .bind(input.issued_from.as_deref())
    .bind(input.issued_to.as_deref())
    .bind(include_exported)
    .fetch_all(&mut *tx)
    .await?;

    if invoices.is_empty() {
        bail!("No invoices are ready for AutoCount export.");
    }

    let invoice_ids = invoices
        .iter()
        .map(|invoice| invoice.id)
        .collect::<Vec<_>>();
    let line_rows = sqlx::query_as::<_, AutoCountExportLineRow>(
        r#"
        SELECT invoice_id, product_id, product_name, unit_price_cents, quantity,
               tax_code, tax_rate_bps, tax_cents
        FROM invoice_line_items
        WHERE invoice_id = ANY($1)
        ORDER BY invoice_id, id
        "#,
    )
    .bind(invoice_ids.as_slice())
    .fetch_all(&mut *tx)
    .await?;

    let mut lines_by_invoice: HashMap<i32, Vec<AutoCountExportLineRow>> = HashMap::new();
    for line in line_rows {
        lines_by_invoice
            .entry(line.invoice_id)
            .or_default()
            .push(line);
    }

    let csv = build_autocount_invoice_csv(&invoices, &mut lines_by_invoice);

    sqlx::query(
        r#"
        UPDATE invoices
        SET exported_to_autocount_at = COALESCE(exported_to_autocount_at, now()),
            updated_at = now()
        WHERE id = ANY($1)
        "#,
    )
    .bind(invoice_ids.as_slice())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(csv)
}
