use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

use super::{
    dto::{CreatePromotionInput, CreateVoucherInput, UpdatePromotionInput, UpdateVoucherInput},
    model::{Promotion, Voucher},
    repository,
};

pub async fn fetch_promotions(pool: &PgPool) -> Result<Vec<Promotion>> {
    repository::fetch_promotions(pool).await
}

pub async fn create_promotion(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreatePromotionInput,
) -> Result<Promotion> {
    let promotion = repository::create_promotion(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "promotion",
        &promotion.id.to_string(),
        &promotion.title,
    )
    .await;
    Ok(promotion)
}

pub async fn update_promotion(
    pool: &PgPool,
    identity: &AdminIdentity,
    promotion_id: i32,
    input: &UpdatePromotionInput,
) -> Result<Promotion> {
    let promotion = repository::update_promotion(pool, promotion_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "promotion",
        &promotion.id.to_string(),
        &promotion.title,
    )
    .await;
    Ok(promotion)
}

pub async fn delete_promotion(
    pool: &PgPool,
    identity: &AdminIdentity,
    promotion_id: i32,
) -> Result<()> {
    repository::delete_promotion(pool, promotion_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "promotion",
        &promotion_id.to_string(),
        "",
    )
    .await;
    Ok(())
}

pub async fn fetch_vouchers(pool: &PgPool) -> Result<Vec<Voucher>> {
    repository::fetch_vouchers(pool).await
}

pub async fn create_voucher(
    pool: &PgPool,
    identity: &AdminIdentity,
    input: &CreateVoucherInput,
) -> Result<Voucher> {
    let voucher = repository::create_voucher(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "voucher",
        &voucher.id.to_string(),
        &voucher.code,
    )
    .await;
    Ok(voucher)
}

pub async fn update_voucher(
    pool: &PgPool,
    identity: &AdminIdentity,
    voucher_id: i32,
    input: &UpdateVoucherInput,
) -> Result<Voucher> {
    let voucher = repository::update_voucher(pool, voucher_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "voucher",
        &voucher.id.to_string(),
        &voucher.code,
    )
    .await;
    Ok(voucher)
}

pub async fn delete_voucher(
    pool: &PgPool,
    identity: &AdminIdentity,
    voucher_id: i32,
) -> Result<()> {
    repository::delete_voucher(pool, voucher_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "voucher",
        &voucher_id.to_string(),
        "",
    )
    .await;
    Ok(())
}
