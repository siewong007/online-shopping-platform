use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreatePaymentInput, UpdatePaymentInput},
    model::Payment,
    repository,
};

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    repository::fetch_payments(pool).await
}

pub async fn create_payment(pool: &PgPool, input: &CreatePaymentInput) -> Result<Payment> {
    repository::create_payment(pool, input).await
}

pub async fn update_payment(
    pool: &PgPool,
    payment_id: i32,
    input: &UpdatePaymentInput,
) -> Result<Payment> {
    repository::update_payment(pool, payment_id, input).await
}

pub async fn delete_payment(pool: &PgPool, payment_id: i32) -> Result<()> {
    repository::delete_payment(pool, payment_id).await
}
