use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

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
    identity: &AdminIdentity,
    order_id: i32,
    input: &UpdateSalesDetailsInput,
) -> Result<SalesRecord> {
    let record = repository::update_sales_details(pool, order_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "sale",
        &order_id.to_string(),
        &record.channel,
    )
    .await;
    Ok(record)
}

pub async fn update_sales_status(
    pool: &PgPool,
    identity: &AdminIdentity,
    order_id: i32,
    input: &UpdateSalesStatusInput,
) -> Result<SalesRecord> {
    let record = repository::update_sales_status(pool, order_id, input, &identity.username).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "sale_status",
        &order_id.to_string(),
        &record.status,
    )
    .await;
    Ok(record)
}

pub async fn fetch_sales_summary(pool: &PgPool) -> Result<SalesSummaryPayload> {
    repository::fetch_sales_summary(pool).await
}
