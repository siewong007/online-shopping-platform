use anyhow::Result;
use sqlx::PgPool;

use super::model::{SupportConversation, SupportIdentity, SupportInboxItem, SupportMessage};

pub async fn create_support_conversation(
    pool: &PgPool,
    guest_name: &str,
    guest_email: &str,
    customer_account_id: Option<i32>,
    body: &str,
    token: &str,
) -> Result<(SupportConversation, SupportMessage)> {
    crate::db::create_support_conversation(
        pool,
        guest_name,
        guest_email,
        customer_account_id,
        body,
        token,
    )
    .await
}

pub async fn authenticate_support_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<SupportIdentity>> {
    crate::db::authenticate_support_session(pool, token).await
}

pub async fn fetch_support_conversation(
    pool: &PgPool,
    conversation_id: i32,
) -> Result<Option<SupportConversation>> {
    crate::db::fetch_support_conversation(pool, conversation_id).await
}

pub async fn fetch_support_messages(
    pool: &PgPool,
    conversation_id: i32,
    after_id: Option<i32>,
    limit: i64,
) -> Result<Vec<SupportMessage>> {
    crate::db::fetch_support_messages(pool, conversation_id, after_id, limit).await
}

pub async fn count_recent_support_conversations_for_guest_email(
    pool: &PgPool,
    guest_email: &str,
) -> Result<i64> {
    crate::db::count_recent_support_conversations_for_guest_email(pool, guest_email).await
}

pub async fn count_recent_guest_support_messages(
    pool: &PgPool,
    conversation_id: i32,
) -> Result<i64> {
    crate::db::count_recent_guest_support_messages(pool, conversation_id).await
}

pub async fn insert_guest_support_message(
    pool: &PgPool,
    conversation_id: i32,
    body: &str,
) -> Result<Option<SupportMessage>> {
    crate::db::insert_guest_support_message(pool, conversation_id, body).await
}

pub async fn insert_admin_support_message(
    pool: &PgPool,
    conversation_id: i32,
    admin_user_id: i32,
    body: &str,
) -> Result<Option<SupportMessage>> {
    crate::db::insert_admin_support_message(pool, conversation_id, admin_user_id, body).await
}

pub async fn close_support_conversation(pool: &PgPool, conversation_id: i32) -> Result<bool> {
    crate::db::close_support_conversation(pool, conversation_id).await
}

pub async fn fetch_support_inbox(
    pool: &PgPool,
    status: Option<&str>,
    before: Option<i32>,
    limit: i64,
) -> Result<Vec<SupportInboxItem>> {
    crate::db::fetch_support_inbox(pool, status, before, limit).await
}

pub async fn active_admin_user_exists(pool: &PgPool, admin_user_id: i32) -> Result<bool> {
    crate::db::active_admin_user_exists(pool, admin_user_id).await
}

pub async fn update_support_conversation(
    pool: &PgPool,
    conversation_id: i32,
    expected_status: &str,
    requested_status: Option<&str>,
    update_assignee: bool,
    assigned_admin_user_id: Option<i32>,
) -> Result<bool> {
    crate::db::update_support_conversation(
        pool,
        conversation_id,
        expected_status,
        requested_status,
        update_assignee,
        assigned_admin_user_id,
    )
    .await
}
