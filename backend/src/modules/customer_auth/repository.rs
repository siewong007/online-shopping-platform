use anyhow::Result;
use sqlx::PgPool;

use super::model::{CustomerAccount, CustomerAccountCredentials, CustomerIdentity};
use crate::models::{CustomerMePayload, CustomerSession};

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
    user_agent: Option<&str>,
) -> Result<()> {
    crate::db::insert_customer_session(pool, customer_account_id, token, user_agent).await
}

pub async fn touch_customer_session(pool: &PgPool, session_id: i32) -> Result<()> {
    crate::db::touch_customer_session(pool, session_id).await
}

pub async fn fetch_customer_sessions(
    pool: &PgPool,
    customer_account_id: i32,
) -> Result<Vec<CustomerSession>> {
    crate::db::fetch_customer_sessions(pool, customer_account_id).await
}

pub async fn delete_customer_session_for_account(
    pool: &PgPool,
    customer_account_id: i32,
    session_id: i32,
) -> Result<bool> {
    crate::db::delete_customer_session_for_account(pool, customer_account_id, session_id).await
}

pub async fn delete_other_customer_sessions(
    pool: &PgPool,
    customer_account_id: i32,
    current_session_id: i32,
) -> Result<()> {
    crate::db::delete_other_customer_sessions(pool, customer_account_id, current_session_id).await
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
