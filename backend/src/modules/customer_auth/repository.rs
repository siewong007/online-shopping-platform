use anyhow::Result;
use sqlx::PgPool;

use super::model::{CustomerAccount, CustomerAccountCredentials, CustomerIdentity};
use crate::models::CustomerMePayload;

pub async fn create_customer_account(
    pool: &PgPool,
    email: &str,
    password_hash: &str,
    display_name: &str,
) -> Result<CustomerAccount> {
    crate::db::create_customer_account(pool, email, password_hash, display_name).await
}

pub async fn fetch_customer_account_by_email(
    pool: &PgPool,
    email: &str,
) -> Result<Option<CustomerAccountCredentials>> {
    crate::db::fetch_customer_account_by_email(pool, email).await
}

pub async fn insert_customer_session(
    pool: &PgPool,
    customer_account_id: i32,
    token: &str,
) -> Result<()> {
    crate::db::insert_customer_session(pool, customer_account_id, token).await
}

pub async fn delete_customer_session(pool: &PgPool, token: &str) -> Result<()> {
    crate::db::delete_customer_session(pool, token).await
}

pub async fn authenticate_customer_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<CustomerIdentity>> {
    crate::db::authenticate_customer_session(pool, token).await
}

pub async fn link_portal_profile_to_account(
    pool: &PgPool,
    customer_account_id: i32,
    email: &str,
) -> Result<()> {
    crate::db::link_portal_profile_to_account(pool, customer_account_id, email).await
}

pub async fn fetch_customer_me(
    pool: &PgPool,
    customer_account_id: i32,
) -> Result<CustomerMePayload> {
    crate::db::fetch_customer_me(pool, customer_account_id).await
}
