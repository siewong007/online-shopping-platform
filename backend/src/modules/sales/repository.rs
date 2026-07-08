use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{UpdateSalesDetailsInput, UpdateSalesStatusInput},
    model::{SalesRecord, SalesSummaryPayload},
};

pub async fn fetch_sales(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<SalesRecord>> {
    crate::db::fetch_sales(pool, limit, before).await
}

pub async fn update_sales_details(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesDetailsInput,
) -> Result<SalesRecord> {
    crate::db::update_sales_details(pool, order_id, input).await
}

pub async fn update_sales_status(
    pool: &PgPool,
    order_id: i32,
    input: &UpdateSalesStatusInput,
    changed_by: &str,
) -> Result<SalesRecord> {
    crate::db::update_sales_status(pool, order_id, input, changed_by).await
}

pub async fn fetch_sales_summary(pool: &PgPool) -> Result<SalesSummaryPayload> {
    crate::db::fetch_sales_summary(pool).await
}
