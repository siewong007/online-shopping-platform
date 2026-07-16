use anyhow::Result;
use axum::{
    extract::FromRequestParts,
    http::{HeaderMap, StatusCode, header::AUTHORIZATION, request::Parts},
};
use sqlx::PgPool;

use crate::{
    app_state::AppState,
    error::HttpError,
    models::Paged,
    modules::{
        audit,
        auth::model::AdminIdentity,
        customer_auth::{model::CustomerIdentity, service as customer_auth_service},
    },
    security::generate_session_token,
};

use super::{
    dto::{
        AdminSupportInboxQuery, AdminSupportThreadPayload, CreateSupportConversationInput,
        CreateSupportConversationPayload, CreateSupportMessageInput, SupportMessagesPayload,
        SupportMessagesQuery, UpdateAdminSupportConversationInput, UpdateSupportConversationInput,
    },
    model::{SupportConversation, SupportIdentity, SupportInboxItem, SupportMessage},
    repository,
};

const DEFAULT_INBOX_LIMIT: i64 = 50;
const MAX_INBOX_LIMIT: i64 = 100;
const MESSAGE_FETCH_LIMIT: i64 = 100;
const MAX_NEW_CONVERSATIONS_PER_EMAIL_10_MINUTES: i64 = 3;
const MAX_GUEST_MESSAGES_PER_CONVERSATION_PER_MINUTE: i64 = 20;

pub async fn create_conversation(
    pool: &PgPool,
    headers: &HeaderMap,
    input: &CreateSupportConversationInput,
) -> Result<CreateSupportConversationPayload, HttpError> {
    let guest_name = required_guest_name(&input.guest_name)?;
    let guest_email = valid_guest_email(&input.guest_email)?;
    let body = valid_message_body(&input.message)?;
    let customer_identity = optional_customer_identity(pool, headers).await?;
    let recent_conversations =
        repository::count_recent_support_conversations_for_guest_email(pool, &guest_email)
            .await
            .map_err(map_support_error)?;
    if recent_conversations >= MAX_NEW_CONVERSATIONS_PER_EMAIL_10_MINUTES {
        return Err(new_conversation_rate_limit_error());
    }
    let token = generate_session_token();

    let (conversation, message) = repository::create_support_conversation(
        pool,
        &guest_name,
        &guest_email,
        customer_identity.map(|identity| identity.customer_account_id),
        &body,
        &token,
    )
    .await
    .map_err(map_support_error)?;

    Ok(CreateSupportConversationPayload {
        token,
        conversation,
        messages: vec![message],
    })
}

pub async fn support_conversation(
    pool: &PgPool,
    identity: &SupportIdentity,
) -> Result<SupportConversation, HttpError> {
    fetch_conversation(pool, identity.conversation_id).await
}

pub async fn support_messages(
    pool: &PgPool,
    identity: &SupportIdentity,
    query: &SupportMessagesQuery,
) -> Result<SupportMessagesPayload, HttpError> {
    let messages = repository::fetch_support_messages(
        pool,
        identity.conversation_id,
        query.after_id,
        MESSAGE_FETCH_LIMIT,
    )
    .await
    .map_err(map_support_error)?;

    Ok(SupportMessagesPayload { messages })
}

pub async fn post_guest_message(
    pool: &PgPool,
    identity: &SupportIdentity,
    input: &CreateSupportMessageInput,
) -> Result<SupportMessage, HttpError> {
    let body = valid_message_body(&input.body)?;
    let recent_guest_messages =
        repository::count_recent_guest_support_messages(pool, identity.conversation_id)
            .await
            .map_err(map_support_error)?;
    if recent_guest_messages >= MAX_GUEST_MESSAGES_PER_CONVERSATION_PER_MINUTE {
        return Err(guest_message_rate_limit_error());
    }
    repository::insert_guest_support_message(pool, identity.conversation_id, &body)
        .await
        .map_err(map_support_error)?
        .ok_or_else(closed_conversation_error)
}

pub async fn close_conversation(
    pool: &PgPool,
    identity: &SupportIdentity,
    input: &UpdateSupportConversationInput,
) -> Result<SupportConversation, HttpError> {
    if input.status.trim() != "closed" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Guests may only close a support conversation.".to_string(),
        ));
    }

    let changed = repository::close_support_conversation(pool, identity.conversation_id)
        .await
        .map_err(map_support_error)?;
    if !changed {
        return Err((
            StatusCode::BAD_REQUEST,
            "This support conversation is already closed.".to_string(),
        ));
    }

    fetch_conversation(pool, identity.conversation_id).await
}

pub async fn admin_inbox(
    pool: &PgPool,
    query: &AdminSupportInboxQuery,
) -> Result<Paged<SupportInboxItem>, HttpError> {
    let status = match query.status.as_deref() {
        Some(status) => Some(valid_status(status)?),
        None => None,
    };
    let limit = inbox_limit(query.limit)?;
    let mut items =
        repository::fetch_support_inbox(pool, status.as_deref(), query.before, limit + 1)
            .await
            .map_err(map_support_error)?;
    let has_more = items.len() > limit as usize;
    if has_more {
        items.truncate(limit as usize);
    }
    let next_cursor = if has_more {
        items.last().map(|conversation| conversation.id)
    } else {
        None
    };

    Ok(Paged { items, next_cursor })
}

pub async fn admin_thread(
    pool: &PgPool,
    conversation_id: i32,
    query: &SupportMessagesQuery,
) -> Result<AdminSupportThreadPayload, HttpError> {
    let conversation = fetch_conversation(pool, conversation_id).await?;
    let messages = repository::fetch_support_messages(
        pool,
        conversation_id,
        query.after_id,
        MESSAGE_FETCH_LIMIT,
    )
    .await
    .map_err(map_support_error)?;

    Ok(AdminSupportThreadPayload {
        conversation,
        messages,
    })
}

pub async fn post_admin_message(
    pool: &PgPool,
    identity: &AdminIdentity,
    conversation_id: i32,
    input: &CreateSupportMessageInput,
) -> Result<SupportMessage, HttpError> {
    let body = valid_message_body(&input.body)?;
    repository::insert_admin_support_message(pool, conversation_id, identity.user_id, &body)
        .await
        .map_err(map_support_error)?
        .ok_or_else(closed_conversation_error)
}

pub async fn update_admin_conversation(
    pool: &PgPool,
    identity: &AdminIdentity,
    conversation_id: i32,
    input: &UpdateAdminSupportConversationInput,
) -> Result<SupportConversation, HttpError> {
    if input.status.is_none() && input.assigned_admin_user_id.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Provide a status or assignee to update this conversation.".to_string(),
        ));
    }

    let current = fetch_conversation(pool, conversation_id).await?;
    let expected_status = current.status.clone();
    let requested_status = input.status.as_deref().map(valid_status).transpose()?;

    if let Some(status) = requested_status.as_deref() {
        validate_status_transition(&current.status, status)?;
    }

    if let Some(assigned_admin_user_id) = input.assigned_admin_user_id {
        let is_active = repository::active_admin_user_exists(pool, assigned_admin_user_id)
            .await
            .map_err(map_support_error)?;
        if !is_active {
            return Err((
                StatusCode::BAD_REQUEST,
                "The assigned admin user must be active.".to_string(),
            ));
        }
    }

    let status_changed = requested_status
        .as_deref()
        .is_some_and(|status| status != current.status);
    let assignment_changed = input
        .assigned_admin_user_id
        .is_some_and(|assigned_admin_user_id| {
            current.assigned_admin_user_id != Some(assigned_admin_user_id)
        });

    let updated = repository::update_support_conversation(
        pool,
        conversation_id,
        &expected_status,
        requested_status.as_deref(),
        input.assigned_admin_user_id.is_some(),
        input.assigned_admin_user_id,
    )
    .await
    .map_err(map_support_error)?;
    if !updated {
        return Err((
            StatusCode::CONFLICT,
            "This support conversation changed before your update. Reload and try again."
                .to_string(),
        ));
    }

    if status_changed {
        audit::service::record_event(
            pool,
            &identity.username,
            "support_conversation_status_changed",
            "support_conversation",
            &conversation_id.to_string(),
            "",
        )
        .await;
    }

    if assignment_changed {
        audit::service::record_event(
            pool,
            &identity.username,
            "support_conversation_assignment_changed",
            "support_conversation",
            &conversation_id.to_string(),
            "",
        )
        .await;
    }

    fetch_conversation(pool, conversation_id).await
}

pub async fn authenticate_support_token(
    pool: &PgPool,
    token: &str,
) -> Result<SupportIdentity, HttpError> {
    repository::authenticate_support_session(pool, token)
        .await
        .map_err(map_support_error)?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Support session is missing or expired.".to_string(),
            )
        })
}

impl FromRequestParts<AppState> for SupportIdentity {
    type Rejection = HttpError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = support_bearer_token(&parts.headers)?;
        authenticate_support_token(&state.pool, token).await
    }
}

async fn optional_customer_identity(
    pool: &PgPool,
    headers: &HeaderMap,
) -> Result<Option<CustomerIdentity>, HttpError> {
    if !headers.contains_key(AUTHORIZATION) {
        return Ok(None);
    }

    let token = customer_bearer_token(headers)?;
    customer_auth_service::authenticate_token(pool, token)
        .await
        .map(Some)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Customer authorization is invalid or expired.".to_string(),
            )
        })
}

async fn fetch_conversation(
    pool: &PgPool,
    conversation_id: i32,
) -> Result<SupportConversation, HttpError> {
    repository::fetch_support_conversation(pool, conversation_id)
        .await
        .map_err(map_support_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                "Support conversation not found.".to_string(),
            )
        })
}

fn required_guest_name(raw: &str) -> Result<String, HttpError> {
    let name = raw.trim();
    if name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Guest name is required.".to_string(),
        ));
    }

    Ok(name.to_string())
}

fn valid_guest_email(raw: &str) -> Result<String, HttpError> {
    let email = raw.trim();
    let mut parts = email.split('@');
    let local = parts.next().unwrap_or_default();
    let domain = parts.next().unwrap_or_default();
    let has_one_at = parts.next().is_none();
    let valid = has_one_at
        && !local.is_empty()
        && !domain.is_empty()
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !email.chars().any(char::is_whitespace);

    if !valid {
        return Err((
            StatusCode::BAD_REQUEST,
            "Enter a valid guest email address.".to_string(),
        ));
    }

    Ok(email.to_string())
}

fn valid_message_body(raw: &str) -> Result<String, HttpError> {
    let body = raw.trim();
    let length = body.chars().count();
    if length == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Support messages cannot be blank.".to_string(),
        ));
    }
    if length > 2_000 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Support messages must be 2,000 characters or fewer.".to_string(),
        ));
    }

    Ok(body.to_string())
}

fn valid_status(raw: &str) -> Result<String, HttpError> {
    let status = raw.trim();
    if matches!(status, "open" | "pending" | "closed") {
        Ok(status.to_string())
    } else {
        Err((
            StatusCode::BAD_REQUEST,
            "Support status must be open, pending, or closed.".to_string(),
        ))
    }
}

fn validate_status_transition(current: &str, requested: &str) -> Result<(), HttpError> {
    if current == requested {
        return Ok(());
    }

    if matches!(
        (current, requested),
        ("open", "pending")
            | ("pending", "open")
            | ("open", "closed")
            | ("pending", "closed")
            | ("closed", "open")
    ) {
        return Ok(());
    }

    Err((
        StatusCode::BAD_REQUEST,
        "This support status transition is not allowed.".to_string(),
    ))
}

fn inbox_limit(limit: Option<i64>) -> Result<i64, HttpError> {
    let limit = limit.unwrap_or(DEFAULT_INBOX_LIMIT);
    if !(1..=MAX_INBOX_LIMIT).contains(&limit) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Support inbox limit must be between 1 and {MAX_INBOX_LIMIT}."),
        ));
    }

    Ok(limit)
}

fn support_bearer_token(headers: &HeaderMap) -> Result<&str, HttpError> {
    bearer_token(headers, "Support authorization is required.")
}

fn customer_bearer_token(headers: &HeaderMap) -> Result<&str, HttpError> {
    bearer_token(headers, "Customer authorization is invalid or expired.")
}

fn bearer_token<'a>(headers: &'a HeaderMap, missing_message: &str) -> Result<&'a str, HttpError> {
    let header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, missing_message.to_string()))?;
    let token = header.strip_prefix("Bearer ").ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            "Authorization must use a Bearer token.".to_string(),
        )
    })?;

    if token.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Authorization must use a Bearer token.".to_string(),
        ));
    }

    Ok(token)
}

fn closed_conversation_error() -> HttpError {
    (
        StatusCode::BAD_REQUEST,
        "This support conversation is closed.".to_string(),
    )
}

fn new_conversation_rate_limit_error() -> HttpError {
    (
        StatusCode::TOO_MANY_REQUESTS,
        "Too many support conversations were started recently for this email. Please wait a few minutes and try again."
            .to_string(),
    )
}

fn guest_message_rate_limit_error() -> HttpError {
    (
        StatusCode::TOO_MANY_REQUESTS,
        "Too many messages were sent to this support conversation. Please wait a minute and try again."
            .to_string(),
    )
}

fn map_support_error(error: anyhow::Error) -> HttpError {
    tracing::error!("support request failed: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to process this support request.".to_string(),
    )
}
