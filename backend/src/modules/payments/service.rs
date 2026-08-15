use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    activation::PaymentInitiationApproval,
    dto::{CreatePaymentInput, RefundPaymentInput, UpdatePaymentInput},
    gateway::{
        self, GatewayReconciliationResult, GatewayRefundInput, GatewayRefundResult,
        PaymentCheckout, PaymentGateway,
    },
    model::Payment,
    repository,
};

pub async fn fetch_payments(pool: &PgPool) -> Result<Vec<Payment>> {
    repository::fetch_payments(pool).await
}

pub async fn reconcile_gateway_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    payment_id: i32,
) -> Result<GatewayReconciliationResult> {
    let payment = crate::db::fetch_gateway_payment(pool, payment_id).await?;
    let gateway = gateway::configured_gateway_for_provider(&payment.provider)?;
    let result = gateway.reconcile(pool, payment_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "reconcile",
        "payment",
        &payment_id.to_string(),
        &result.status,
    )
    .await;
    Ok(result)
}

pub async fn refund_gateway_payment(
    pool: &PgPool,
    identity: &AdminIdentity,
    payment_id: i32,
    input: &RefundPaymentInput,
) -> Result<GatewayRefundResult> {
    let payment = crate::db::fetch_gateway_payment(pool, payment_id).await?;
    let gateway = gateway::configured_gateway_for_provider(&payment.provider)?;
    let result = gateway
        .refund(
            pool,
            GatewayRefundInput {
                payment_id,
                amount_cents: input.amount_cents,
                idempotency_key: input.idempotency_key.clone(),
                requested_by: identity.username.clone(),
            },
        )
        .await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "refund",
        "payment",
        &payment_id.to_string(),
        &format!("{} {} cents", result.status, result.amount_cents),
    )
    .await;
    Ok(result)
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

/// `_approval` is unused at runtime and required at compile time: it can only be produced by
/// `activation::authorize_checkout`, so the activation gate cannot be skipped by adding another
/// caller here. Everything below this line mutates commerce state.
pub async fn start_gateway_checkout(
    pool: &PgPool,
    gateway: &dyn PaymentGateway,
    input: &crate::models::CreateOrderInput,
    customer_account_id: Option<i32>,
    _approval: &PaymentInitiationApproval,
) -> Result<PaymentCheckout> {
    let order =
        crate::modules::orders::service::create_order(pool, "customer", input, customer_account_id)
            .await?;

    match gateway.start_checkout(pool, order.clone()).await {
        Ok(checkout) => Ok(checkout),
        Err(error) => {
            // Delete only when the adapter failed before creating its durable payment ledger.
            // Once that row exists, the provider may already have accepted a request even if its
            // response was lost. Retaining the order lets webhooks/reconciliation resolve it and
            // lets the abandoned-order sweep release its stock safely instead of orphaning a
            // potentially valid paid transaction.
            match sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM payments WHERE order_id = $1)",
            )
            .bind(order.id)
            .fetch_one(pool)
            .await
            {
                Ok(false) => {
                    if let Err(cleanup_error) = crate::db::delete_order(pool, order.id).await {
                        tracing::error!(%cleanup_error, order_id = order.id, provider = gateway.provider(), "failed to clean up incomplete payment checkout");
                    }
                }
                Ok(true) => {
                    tracing::warn!(
                        order_id = order.id,
                        provider = gateway.provider(),
                        "retaining checkout with an unresolved provider payment request"
                    );
                }
                Err(lookup_error) => {
                    tracing::error!(%lookup_error, order_id = order.id, provider = gateway.provider(), "could not determine whether failed checkout reached the provider; retaining order");
                }
            }
            Err(error)
        }
    }
}
