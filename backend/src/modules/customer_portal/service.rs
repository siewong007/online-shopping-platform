use anyhow::Result;
use sqlx::PgPool;

use super::{
    dto::{
        CreateCustomerPortalProfileInput, CustomerLookupPayload, UpdateCustomerPortalProfileInput,
    },
    model::CustomerPortalProfile,
    repository,
};

pub async fn fetch_customer_portal_profiles(pool: &PgPool) -> Result<Vec<CustomerPortalProfile>> {
    repository::fetch_customer_portal_profiles(pool).await
}

pub async fn lookup_customer_portal(pool: &PgPool, email: &str) -> Result<CustomerLookupPayload> {
    repository::lookup_customer_portal(pool, email).await
}

pub async fn create_customer_portal_profile(
    pool: &PgPool,
    input: &CreateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    repository::create_customer_portal_profile(pool, input).await
}

pub async fn update_customer_portal_profile(
    pool: &PgPool,
    profile_id: i32,
    input: &UpdateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    repository::update_customer_portal_profile(pool, profile_id, input).await
}

pub async fn delete_customer_portal_profile(pool: &PgPool, profile_id: i32) -> Result<()> {
    repository::delete_customer_portal_profile(pool, profile_id).await
}
