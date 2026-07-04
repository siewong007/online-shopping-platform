use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    dto::{CreateOrderInput, UpdateOrderFulfillmentInput},
    model::Order,
    repository,
};

pub async fn fetch_orders(pool: &PgPool) -> Result<Vec<Order>> {
    repository::fetch_orders(pool).await
}

pub async fn create_order(
    pool: &PgPool,
    actor: &str,
    input: &CreateOrderInput,
    customer_account_id: Option<i32>,
) -> Result<Order> {
    let order = repository::create_order(pool, input, customer_account_id).await?;
    audit::service::record_event(
        pool,
        actor,
        "create",
        "order",
        &order.id.to_string(),
        &order.customer_name,
    )
    .await;
    Ok(order)
}

pub async fn update_order(
    pool: &PgPool,
    identity: &AdminIdentity,
    order_id: i32,
    input: &CreateOrderInput,
) -> Result<Order> {
    let order = repository::update_order(pool, order_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "order",
        &order.id.to_string(),
        &order.customer_name,
    )
    .await;
    Ok(order)
}

pub async fn delete_order(pool: &PgPool, identity: &AdminIdentity, order_id: i32) -> Result<()> {
    repository::delete_order(pool, order_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "order",
        &order_id.to_string(),
        "",
    )
    .await;
    Ok(())
}

pub async fn update_order_fulfillment(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateOrderFulfillmentInput,
    changed_by: &str,
) -> Result<Order> {
    let order = repository::update_order_fulfillment(pool, order_id, input, changed_by).await?;
    audit::service::record_event(
        pool,
        changed_by,
        "update",
        "order_fulfillment",
        &order.id.to_string(),
        &input.to_status,
    )
    .await;
    Ok(order)
}
