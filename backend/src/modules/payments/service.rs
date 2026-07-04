use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    dto::{CreatePaymentInput, UpdatePaymentInput},
    model::Payment,
    repository,
};

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    repository::fetch_payments(pool).await
}

pub async fn create_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreatePaymentInput,
) -> Result<Payment> {
    let payment = repository::create_payment(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "payment",
        &payment.id.to_string(),
        &format!("order #{}", payment.order_id),
    )
    .await;
    Ok(payment)
}

pub async fn update_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    payment_id: i32,
    input: &UpdatePaymentInput,
) -> Result<Payment> {
    let payment = repository::update_payment(pool, payment_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "payment",
        &payment.id.to_string(),
        &payment.status,
    )
    .await;
    Ok(payment)
}

pub async fn delete_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    payment_id: i32,
) -> Result<()> {
    repository::delete_payment(pool, payment_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "payment",
        &payment_id.to_string(),
        "",
    )
    .await;
    Ok(())
}
