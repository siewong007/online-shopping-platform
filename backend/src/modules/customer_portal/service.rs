use anyhow::Result;
use sqlx::PgPool;

use crate::modules::{audit, auth::model::AdminIdentity};

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
    identity: &AdminIdentity,
    input: &CreateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    let profile = repository::create_customer_portal_profile(pool, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "create",
        "customer_portal_profile",
        &profile.id.to_string(),
        &profile.customer_email,
    )
    .await;
    Ok(profile)
}

pub async fn update_customer_portal_profile(
    pool: &PgPool,
    identity: &AdminIdentity,
    profile_id: i32,
    input: &UpdateCustomerPortalProfileInput,
) -> Result<CustomerPortalProfile> {
    let profile = repository::update_customer_portal_profile(pool, profile_id, input).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "update",
        "customer_portal_profile",
        &profile.id.to_string(),
        &profile.customer_email,
    )
    .await;
    Ok(profile)
}

pub async fn delete_customer_portal_profile(
    pool: &PgPool,
    identity: &AdminIdentity,
    profile_id: i32,
) -> Result<()> {
    repository::delete_customer_portal_profile(pool, profile_id).await?;
    audit::service::record_event(
        pool,
        &identity.username,
        "delete",
        "customer_portal_profile",
        &profile_id.to_string(),
        "",
    )
    .await;
    Ok(())
}
