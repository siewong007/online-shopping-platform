use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateOrderInput, UpdateOrderFulfillmentInput},
    model::Order,
};

pub async fn create_order(
    pool: &PgPool,
    input: &CreateOrderInput,
    customer_account_id: Option<i32>,
) -> Result<Order> {
    crate::db::create_order(pool, input, customer_account_id).await
}

pub async fn fetch_orders(pool: &PgPool, limit: i64, before: Option<i32>) -> Result<Vec<Order>> {
    crate::db::fetch_orders(pool, limit, before).await
}

pub async fn update_order(pool: &PgPool, order_id: i32, input: &CreateOrderInput) -> Result<Order> {
    crate::db::update_order(pool, order_id, input).await
}

pub async fn delete_order(pool: &PgPool, order_id: i32) -> Result<()> {
    crate::db::delete_order(pool, order_id).await
}

pub async fn update_order_fulfillment(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateOrderFulfillmentInput,
    changed_by: &str,
) -> Result<Order> {
    crate::db::update_order_fulfillment(pool, order_id, input, changed_by).await
}
