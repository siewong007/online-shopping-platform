use anyhow::Result;
use sqlx::PgPool;

use crate::models::{SupportConversation, SupportIdentity, SupportInboxItem, SupportMessage};

pub async fn create_support_conversation(
    pool: &PgPool,
    guest_name: &str,
    guest_email: &str,
    customer_account_id: Option<i32>,
    body: &str,
    token: &str,
) -> Result<(SupportConversation, SupportMessage)> {
    let mut transaction = pool.begin().await?;

    let conversation_id = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO support_conversations (guest_name, guest_email, customer_account_id)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(guest_name)
    .bind(guest_email)
    .bind(customer_account_id)
    .fetch_one(&mut *transaction)
    .await?;

    let message = sqlx::query_as::<_, SupportMessage>(
        r#"
        INSERT INTO support_messages (conversation_id, author_kind, body)
        VALUES ($1, 'guest', $2)
        RETURNING id,
                  conversation_id,
                  author_kind,
                  admin_user_id,
                  body,
                  created_at::text AS created_at
        "#,
    )
    .bind(conversation_id)
    .bind(body)
    .fetch_one(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        UPDATE support_conversations
        SET updated_at = now(),
            last_message_at = now()
        WHERE id = $1
        "#,
    )
    .bind(conversation_id)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO support_sessions (token, conversation_id, expires_at)
        VALUES ($1, $2, now() + interval '30 days')
        "#,
    )
    .bind(token)
    .bind(conversation_id)
    .execute(&mut *transaction)
    .await?;

    let conversation = sqlx::query_as::<_, SupportConversation>(
        r#"
        SELECT support_conversations.id,
               support_conversations.guest_name,
               support_conversations.guest_email,
               support_conversations.customer_account_id,
               support_conversations.assigned_admin_user_id,
               admin_users.display_name AS assigned_admin_display_name,
               support_conversations.status,
               support_conversations.created_at::text AS created_at,
               support_conversations.updated_at::text AS updated_at,
               support_conversations.last_message_at::text AS last_message_at
        FROM support_conversations
        LEFT JOIN admin_users
            ON admin_users.id = support_conversations.assigned_admin_user_id
        WHERE support_conversations.id = $1
        "#,
    )
    .bind(conversation_id)
    .fetch_one(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok((conversation, message))
}

pub async fn authenticate_support_session(
    pool: &PgPool,
    token: &str,
) -> Result<Option<SupportIdentity>> {
    sqlx::query_as::<_, SupportIdentity>(
        r#"
        SELECT support_sessions.conversation_id
        FROM support_sessions
        JOIN support_conversations
            ON support_conversations.id = support_sessions.conversation_id
        WHERE support_sessions.token = $1
          AND support_sessions.expires_at > now()
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_support_conversation(
    pool: &PgPool,
    conversation_id: i32,
) -> Result<Option<SupportConversation>> {
    sqlx::query_as::<_, SupportConversation>(
        r#"
        SELECT support_conversations.id,
               support_conversations.guest_name,
               support_conversations.guest_email,
               support_conversations.customer_account_id,
               support_conversations.assigned_admin_user_id,
               admin_users.display_name AS assigned_admin_display_name,
               support_conversations.status,
               support_conversations.created_at::text AS created_at,
               support_conversations.updated_at::text AS updated_at,
               support_conversations.last_message_at::text AS last_message_at
        FROM support_conversations
        LEFT JOIN admin_users
            ON admin_users.id = support_conversations.assigned_admin_user_id
        WHERE support_conversations.id = $1
        "#,
    )
    .bind(conversation_id)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

pub async fn fetch_support_messages(
    pool: &PgPool,
    conversation_id: i32,
    after_id: Option<i32>,
    limit: i64,
) -> Result<Vec<SupportMessage>> {
    sqlx::query_as::<_, SupportMessage>(
        r#"
        SELECT id,
               conversation_id,
               author_kind,
               admin_user_id,
               body,
               created_at::text AS created_at
        FROM support_messages
        WHERE conversation_id = $1
          AND ($2::INTEGER IS NULL OR id > $2)
        ORDER BY id ASC
        LIMIT $3
        "#,
    )
    .bind(conversation_id)
    .bind(after_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn insert_guest_support_message(
    pool: &PgPool,
    conversation_id: i32,
    body: &str,
) -> Result<Option<SupportMessage>> {
    insert_support_message(pool, conversation_id, "guest", None, body).await
}

pub async fn insert_admin_support_message(
    pool: &PgPool,
    conversation_id: i32,
    admin_user_id: i32,
    body: &str,
) -> Result<Option<SupportMessage>> {
    insert_support_message(pool, conversation_id, "admin", Some(admin_user_id), body).await
}

pub async fn close_support_conversation(pool: &PgPool, conversation_id: i32) -> Result<bool> {
    let result = sqlx::query(
        r#"
        UPDATE support_conversations
        SET status = 'closed',
            updated_at = now()
        WHERE id = $1
          AND status IN ('open', 'pending')
        "#,
    )
    .bind(conversation_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn fetch_support_inbox(
    pool: &PgPool,
    status: Option<&str>,
    before: Option<i32>,
    limit: i64,
) -> Result<Vec<SupportInboxItem>> {
    sqlx::query_as::<_, SupportInboxItem>(
        r#"
        SELECT support_conversations.id,
               support_conversations.guest_name,
               support_conversations.guest_email,
               support_conversations.customer_account_id,
               support_conversations.assigned_admin_user_id,
               admin_users.display_name AS assigned_admin_display_name,
               support_conversations.status,
               support_conversations.created_at::text AS created_at,
               support_conversations.updated_at::text AS updated_at,
               support_conversations.last_message_at::text AS last_message_at,
               COALESCE(LEFT(last_message.body, 160), '') AS last_message_preview,
               COALESCE(last_message.author_kind, '') AS last_message_author_kind
        FROM support_conversations
        LEFT JOIN admin_users
            ON admin_users.id = support_conversations.assigned_admin_user_id
        LEFT JOIN LATERAL (
            SELECT body, author_kind
            FROM support_messages
            WHERE conversation_id = support_conversations.id
            ORDER BY id DESC
            LIMIT 1
        ) AS last_message ON TRUE
        WHERE ($1::TEXT IS NULL OR support_conversations.status = $1)
          AND (
              $2::INTEGER IS NULL
              OR (support_conversations.last_message_at, support_conversations.id) < (
                  SELECT cursor.last_message_at, cursor.id
                  FROM support_conversations AS cursor
                  WHERE cursor.id = $2
              )
          )
        ORDER BY support_conversations.last_message_at DESC, support_conversations.id DESC
        LIMIT $3
        "#,
    )
    .bind(status)
    .bind(before)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn active_admin_user_exists(pool: &PgPool, admin_user_id: i32) -> Result<bool> {
    sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM admin_users
            WHERE id = $1
              AND is_active = TRUE
        )
        "#,
    )
    .bind(admin_user_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_support_conversation(
    pool: &PgPool,
    conversation_id: i32,
    status: &str,
    update_assignee: bool,
    assigned_admin_user_id: Option<i32>,
) -> Result<bool> {
    let result = sqlx::query(
        r#"
        UPDATE support_conversations
        SET status = $2,
            assigned_admin_user_id = CASE
                WHEN $3 THEN $4
                ELSE assigned_admin_user_id
            END,
            updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(conversation_id)
    .bind(status)
    .bind(update_assignee)
    .bind(assigned_admin_user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

async fn insert_support_message(
    pool: &PgPool,
    conversation_id: i32,
    author_kind: &str,
    admin_user_id: Option<i32>,
    body: &str,
) -> Result<Option<SupportMessage>> {
    sqlx::query_as::<_, SupportMessage>(
        r#"
        WITH active_conversation AS (
            UPDATE support_conversations
            SET updated_at = now(),
                last_message_at = now()
            WHERE id = $1
              AND status IN ('open', 'pending')
            RETURNING id
        )
        INSERT INTO support_messages (conversation_id, author_kind, admin_user_id, body)
        SELECT id, $2, $3, $4
        FROM active_conversation
        RETURNING id,
                  conversation_id,
                  author_kind,
                  admin_user_id,
                  body,
                  created_at::text AS created_at
        "#,
    )
    .bind(conversation_id)
    .bind(author_kind)
    .bind(admin_user_id)
    .bind(body)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}
