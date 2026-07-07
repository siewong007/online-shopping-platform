use anyhow::Result;
use axum::http::StatusCode;
use sqlx::PgPool;

use crate::{
    error::HttpError,
    models::{
        CustomerIdentity, CustomerTransactionsPayload, MembershipBenefitsPayload,
        MembershipPayload, NextMembershipTier,
    },
    modules::{audit, auth::model::AdminIdentity},
};

use super::{
    dto::{
        CreateCustomerPortalProfileInput, CustomerLookupPayload, UpdateCustomerPortalProfileInput,
    },
    model::CustomerPortalProfile,
    repository,
};

const MAX_TRANSACTIONS_LIMIT: i64 = 100;
const DEFAULT_TRANSACTIONS_LIMIT: i64 = 20;

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

pub async fn membership(
    pool: &PgPool,
    identity: &CustomerIdentity,
) -> Result<MembershipPayload, HttpError> {
    let profile = repository::fetch_membership_profile(pool, identity.customer_account_id)
        .await
        .map_err(map_membership_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                "No membership profile is linked to this account.".to_string(),
            )
        })?;

    let tiers = repository::fetch_membership_tiers(pool)
        .await
        .map_err(map_membership_error)?;

    let current_tier = tiers
        .iter()
        .find(|tier| tier.name.eq_ignore_ascii_case(&profile.membership_tier))
        .cloned();

    // The next tier is the lowest-ranked tier ranked above the current one; if the
    // customer's tier name is unknown, fall back to the lowest tier they don't yet meet.
    let current_rank = current_tier.as_ref().map(|tier| tier.rank);
    let next_tier = tiers
        .iter()
        .filter(|tier| match current_rank {
            Some(rank) => tier.rank > rank,
            None => tier.min_lifetime_purchase_cents > profile.lifetime_purchase_cents,
        })
        .min_by_key(|tier| tier.rank)
        .map(|tier| NextMembershipTier {
            name: tier.name.clone(),
            min_lifetime_purchase_cents: tier.min_lifetime_purchase_cents,
            remaining_cents: (tier.min_lifetime_purchase_cents - profile.lifetime_purchase_cents)
                .max(0),
        });

    Ok(MembershipPayload {
        profile,
        current_tier,
        next_tier,
    })
}

pub async fn benefits(
    pool: &PgPool,
    identity: &CustomerIdentity,
) -> Result<MembershipBenefitsPayload, HttpError> {
    let profile = repository::fetch_membership_profile(pool, identity.customer_account_id)
        .await
        .map_err(map_membership_error)?;

    let tiers = repository::fetch_membership_tiers_with_benefits(pool)
        .await
        .map_err(map_membership_error)?;

    Ok(MembershipBenefitsPayload {
        current_tier: profile.map(|profile| profile.membership_tier),
        tiers,
    })
}

pub async fn transactions(
    pool: &PgPool,
    identity: &CustomerIdentity,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<CustomerTransactionsPayload, HttpError> {
    let limit = limit
        .unwrap_or(DEFAULT_TRANSACTIONS_LIMIT)
        .clamp(1, MAX_TRANSACTIONS_LIMIT);
    let offset = offset.unwrap_or(0).max(0);

    repository::fetch_customer_transactions(pool, identity.customer_account_id, limit, offset)
        .await
        .map_err(map_membership_error)
}

fn map_membership_error(error: anyhow::Error) -> HttpError {
    tracing::error!("customer membership query failed: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to load membership records.".to_string(),
    )
}
