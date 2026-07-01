use anyhow::Result;
use sqlx::PgPool;

use super::{dto::CreateOrderInput, model::Order, repository};

pub async fn fetch_orders(pool: &PgPool) -> Result<Vec<Order>> {
    repository::fetch_orders(pool).await
}

pub async fn create_order(pool: &PgPool, input: &CreateOrderInput) -> Result<Order> {
    repository::create_order(pool, input).await
}

pub async fn update_order(pool: &PgPool, order_id: i32, input: &CreateOrderInput) -> Result<Order> {
    repository::update_order(pool, order_id, input).await
}

pub async fn delete_order(pool: &PgPool, order_id: i32) -> Result<()> {
    repository::delete_order(pool, order_id).await
}
