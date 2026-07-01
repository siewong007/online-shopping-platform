use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreatePaymentInput, UpdatePaymentInput},
    model::Payment,
};

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    crate::db::fetch_payments(pool).await
}

pub async fn create_payment(pool: &PgPool, input: &CreatePaymentInput) -> Result<Payment> {
    crate::db::create_payment(pool, input).await
}

pub async fn update_payment(
    pool: &PgPool,
    payment_id: i32,
    input: &UpdatePaymentInput,
) -> Result<Payment> {
    crate::db::update_payment(pool, payment_id, input).await
}

pub async fn delete_payment(pool: &PgPool, payment_id: i32) -> Result<()> {
    crate::db::delete_payment(pool, payment_id).await
}
