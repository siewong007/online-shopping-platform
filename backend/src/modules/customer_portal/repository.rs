use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{CreateCustomerPortalProfileInput, UpdateCustomerPortalProfileInput},
    model::CustomerPortalProfile,
};

pub async fn fetch_customer_portal_profiles(pool: &PgPool) -> Result<Vec<CustomerPortalProfile>> {
    crate::db::fetch_customer_portal_profiles(pool).await
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
