use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateInvoiceFromOrderInput, RecordInvoicePaymentInput, UpdateInvoiceBillingInput},
    model::Invoice,
};

pub async fn fetch_invoices(pool: &PgPool) -> Result<Vec<Invoice>> {
    crate::db::fetch_invoices(pool).await
}

pub async fn create_invoice_from_order(
    pool: &PgPool,
    order_id: i32,
    input: &CreateInvoiceFromOrderInput,
) -> Result<Invoice> {
    crate::db::create_invoice_from_order(pool, order_id, input).await
}

pub async fn update_invoice_billing(
    pool: &PgPool,
    invoice_id: i32,
    input: &UpdateInvoiceBillingInput,
) -> Result<Invoice> {
    crate::db::update_invoice_billing(pool, invoice_id, input).await
}

pub async fn void_invoice(pool: &PgPool, invoice_id: i32) -> Result<Invoice> {
    crate::db::void_invoice(pool, invoice_id).await
}

pub async fn record_invoice_payment(
    pool: &PgPool,
    invoice_id: i32,
    input: &RecordInvoicePaymentInput,
) -> Result<Invoice> {
    crate::db::record_invoice_payment(pool, invoice_id, input).await
}
