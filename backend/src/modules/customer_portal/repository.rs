use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateCustomerPortalProfileInput, UpdateCustomerPortalProfileInput},
    model::CustomerPortalProfile,
};

pub async fn fetch_customer_portal_profiles(
    pool: &PgPool,
    limit: i64,
    before: Option<i32>,
) -> Result<Vec<CustomerPortalProfile>> {
    crate::db::fetch_customer_portal_profiles(pool, limit, before).await
}

pub async fn verify_customer_order_ownership(
    pool: &PgPool,
    email: &str,
    order_id: i32,
) -> Result<bool> {
    crate::db::verify_customer_order_ownership(pool, email, order_id).await
}

pub async fn lookup_customer_portal(
    pool: &PgPool,
    email: &str,
) -> Result<crate::models::CustomerLookupPayload> {
    crate::db::lookup_customer_portal(pool, email).await
}

pub async fn create_customer_portal_profile(
    pool: &PgPool,
    input: &CreateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    crate::db::create_customer_portal_profile(pool, input).await
}

pub async fn update_customer_portal_profile(
    pool: &PgPool,
    profile_id: i32,
    input: &UpdateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    crate::db::update_customer_portal_profile(pool, profile_id, input).await
}

pub async fn delete_customer_portal_profile(pool: &PgPool, profile_id: i32) -> Result<()> {
    crate::db::delete_customer_portal_profile(pool, profile_id).await
}

pub async fn fetch_membership_profile(
    pool: &PgPool,
    customer_account_id: i32,
) -> Result<Option<crate::models::CustomerLookupProfile>> {
    crate::db::fetch_membership_profile(pool, customer_account_id).await
}

pub async fn fetch_membership_tiers(pool: &PgPool) -> Result<Vec<crate::models::MembershipTier>> {
    crate::db::fetch_membership_tiers(pool).await
}

pub async fn fetch_membership_tiers_with_benefits(
    pool: &PgPool,
) -> Result<Vec<crate::models::MembershipTierWithBenefits>> {
    crate::db::fetch_membership_tiers_with_benefits(pool).await
}

pub async fn fetch_customer_transactions(
    pool: &PgPool,
    customer_account_id: i32,
    limit: i64,
    offset: i64,
) -> Result<crate::models::CustomerTransactionsPayload> {
    crate::db::fetch_customer_transactions(pool, customer_account_id, limit, offset).await
}
