use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    dto::{CreateInvoiceFromOrderInput, RecordInvoicePaymentInput, UpdateInvoiceBillingInput},
    model::Invoice,
    repository,
};

pub async fn fetch_invoices(pool: &PgPool) -> Result<Vec<Invoice>> {
    repository::fetch_invoices(pool).await
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
