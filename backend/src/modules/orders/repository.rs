use anyhow::Result;
use sqlx::PgPool;

use super::{dto::CreateOrderInput, model::Order};

pub async fn create_order(pool: &PgPool, input: &CreateOrderInput) -> Result<Order> {
    crate::db::create_order(pool, input).await
}

pub async fn fetch_orders(pool: &PgPool) -> Result<Vec<Order>> {
    crate::db::fetch_orders(pool).await
}

pub async fn update_order(pool: &PgPool, order_id: i32, input: &CreateOrderInput) -> Result<Order> {
    crate::db::update_order(pool, order_id, input).await
}

pub async fn delete_order(pool: &PgPool, order_id: i32) -> Result<()> {
    crate::db::delete_order(pool, order_id).await
}
