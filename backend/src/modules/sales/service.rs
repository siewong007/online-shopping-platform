use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{UpdateSalesDetailsInput, UpdateSalesStatusInput},
    model::{SalesRecord, SalesSummaryPayload},
    repository,
};

pub async fn fetch_sales(pool: &PgPool) -> Result<Vec<SalesRecord>> {
    repository::fetch_sales(pool).await
}

pub async fn update_sales_details(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesDetailsInput,
) -> Result<SalesRecord> {
    repository::update_sales_details(pool, order_id, input).await
}

pub async fn update_sales_status(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesStatusInput,
) -> Result<SalesRecord> {
    repository::update_sales_status(pool, order_id, input).await
}

pub async fn fetch_sales_summary(pool: &PgPool) -> Result<SalesSummaryPayload> {
    repository::fetch_sales_summary(pool).await
}
