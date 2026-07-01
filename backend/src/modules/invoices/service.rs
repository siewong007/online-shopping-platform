use anyhow::Result;
use sqlx::PgPool;

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
    order_id: i32,
    input: &CreateInvoiceFromOrderInput,
) -> Result<Invoice> {
    repository::create_invoice_from_order(pool, order_id, input).await
}

pub async fn update_invoice_billing(
    pool: &PgPool,
    invoice_id: i32,
    input: &UpdateInvoiceBillingInput,
) -> Result<Invoice> {
    repository::update_invoice_billing(pool, invoice_id, input).await
}

pub async fn void_invoice(pool: &PgPool, invoice_id: i32) -> Result<Invoice> {
    repository::void_invoice(pool, invoice_id).await
}

pub async fn record_invoice_payment(
    pool: &PgPool,
    invoice_id: i32,
    input: &RecordInvoicePaymentInput,
) -> Result<Invoice> {
    repository::record_invoice_payment(pool, invoice_id, input).await
}
