use anyhow::Result;
use sqlx::PgPool;

use crate::{
    models::Paged,
    modules::{audit, auth::model::AdminIdentity},
};

use super::{
    dto::{CreateInvoiceFromOrderInput, RecordInvoicePaymentInput, UpdateInvoiceBillingInput},
    model::Invoice,
    repository,
};

const DEFAULT_LIST_LIMIT: i64 = 50;
const MAX_LIST_LIMIT: i64 = 100;

pub async fn fetch_invoices(
    pool: &PgPool,
    limit: Option<i64>,
    before: Option<i32>,
) -> Result<Paged<Invoice>> {
    let limit = limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT);
    let mut items = repository::fetch_invoices(pool, limit + 1, before).await?;
    let has_more = items.len() > limit as usize;
    if has_more {
        items.truncate(limit as usize);
    }
    let next_cursor = if has_more {
        items.last().map(|invoice| invoice.id)
    } else {
        None
    };

    Ok(Paged { items, next_cursor })
}

pub async fn create_invoice_from_order(
    pool: &PgPool,
    identity: &AdminIdentity,
    order_id: i32,
    input: &CreateInvoiceFromOrderInput,
) -> Result<Invoice> {
    let invoice = repository::create_invoice_from_order(pool, order_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "invoice",
        &invoice.id.to_string(),
        &invoice.invoice_number,
    )
    .await;
    Ok(invoice)
}

pub async fn update_invoice_billing(
    pool: &PgPool,
    identity: &AdminIdentity,
    invoice_id: i32,
    input: &UpdateInvoiceBillingInput,
) -> Result<Invoice> {
    let invoice = repository::update_invoice_billing(pool, invoice_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "invoice",
        &invoice.id.to_string(),
        &invoice.invoice_number,
    )
    .await;
    Ok(invoice)
}

pub async fn void_invoice(
    pool: &PgPool,
    identity: &AdminIdentity,
    invoice_id: i32,
) -> Result<Invoice> {
    let invoice = repository::void_invoice(pool, invoice_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "void",
        "invoice",
        &invoice.id.to_string(),
        &invoice.invoice_number,
    )
    .await;
    Ok(invoice)
}

pub async fn record_invoice_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    invoice_id: i32,
    input: &RecordInvoicePaymentInput,
) -> Result<Invoice> {
    let invoice = repository::record_invoice_payment(pool, invoice_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "payment",
        "invoice",
        &invoice.id.to_string(),
        &invoice.invoice_number,
    )
    .await;
    Ok(invoice)
}
