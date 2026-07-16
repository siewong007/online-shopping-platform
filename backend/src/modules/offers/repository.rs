use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreatePromotionInput, CreateVoucherInput, UpdatePromotionInput, UpdateVoucherInput},
    model::{Promotion, Voucher},
};

pub async fn fetch_promotions(pool: &PgPool) -> Result<Vec<Promotion>> {
    crate::db::fetch_admin_promotions(pool).await
}

pub async fn create_promotion(pool: &PgPool, input: &CreatePromotionInput) -> Result<Promotion> {
    crate::db::create_promotion(pool, input).await
}

pub async fn update_promotion(
    pool: &PgPool,
    promotion_id: i32,
    input: &UpdatePromotionInput,
) -> Result<Promotion> {
    crate::db::update_promotion(pool, promotion_id, input).await
}

pub async fn delete_promotion(pool: &PgPool, promotion_id: i32) -> Result<()> {
    crate::db::delete_promotion(pool, promotion_id).await
}

pub async fn fetch_vouchers(pool: &PgPool) -> Result<Vec<Voucher>> {
    crate::db::fetch_admin_vouchers(pool).await
}

pub async fn create_voucher(pool: &PgPool, input: &CreateVoucherInput) -> Result<Voucher> {
    crate::db::create_voucher(pool, input).await
}

pub async fn update_voucher(
    pool: &PgPool,
    voucher_id: i32,
    input: &UpdateVoucherInput,
) -> Result<Voucher> {
    crate::db::update_voucher(pool, voucher_id, input).await
}

pub async fn delete_voucher(pool: &PgPool, voucher_id: i32) -> Result<()> {
    crate::db::delete_voucher(pool, voucher_id).await
}
