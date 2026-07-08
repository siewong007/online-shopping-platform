use anyhow::Result;
use sqlx::PgPool;

use crate::{
    models::Paged,
    modules::{audit, auth::model::AdminIdentity},
};

use super::{
    dto::{UpdateSalesDetailsInput, UpdateSalesStatusInput},
    model::{SalesRecord, SalesSummaryPayload},
    repository,
};

const DEFAULT_LIST_LIMIT: i64 = 50;
const MAX_LIST_LIMIT: i64 = 100;

pub async fn fetch_sales(
    pool: &PgPool,
    limit: Option<i64>,
    before: Option<i32>,
) -> Result<Paged<SalesRecord>> {
    let limit = limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT);
    let mut items = repository::fetch_sales(pool, limit + 1, before).await?;
    let has_more = items.len() > limit as usize;
    if has_more {
        items.truncate(limit as usize);
    }
    let next_cursor = if has_more {
        items.last().map(|record| record.order_id)
    } else {
        None
    };

    Ok(Paged { items, next_cursor })
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
