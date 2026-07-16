use axum::{
    Json,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
};

use crate::{
    app_state::AppState,
    error,
    models::Paged,
    modules::{
        auth::model::AdminIdentity,
        permissions::{self, model::PermissionAction},
    },
};

use super::{
    dto::{
        AdminSupportInboxQuery, AdminSupportThreadPayload, CreateSupportConversationInput,
        CreateSupportConversationPayload, CreateSupportMessageInput, SupportMessagesPayload,
        SupportMessagesQuery, UpdateAdminSupportConversationInput, UpdateSupportConversationInput,
    },
    model::{
        ADMIN_SUPPORT_PAGE, SupportConversation, SupportIdentity, SupportInboxItem, SupportMessage,
    },
    service,
};

pub async fn create_conversation(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateSupportConversationInput>,
) -> Result<(StatusCode, Json<CreateSupportConversationPayload>), error::HttpError> {
    service::create_conversation(&state.pool, &headers, &input)
        .await
        .map(|payload| (StatusCode::CREATED, Json(payload)))
}

pub async fn support_conversation(
    State(state): State<AppState>,
    identity: SupportIdentity,
) -> Result<Json<SupportConversation>, error::HttpError> {
    service::support_conversation(&state.pool, &identity)
        .await
        .map(Json)
}

pub async fn support_messages(
    State(state): State<AppState>,
    identity: SupportIdentity,
    Query(query): Query<SupportMessagesQuery>,
) -> Result<Json<SupportMessagesPayload>, error::HttpError> {
    service::support_messages(&state.pool, &identity, &query)
        .await
        .map(Json)
}

pub async fn post_guest_message(
    State(state): State<AppState>,
    identity: SupportIdentity,
    Json(input): Json<CreateSupportMessageInput>,
) -> Result<Json<SupportMessage>, error::HttpError> {
    service::post_guest_message(&state.pool, &identity, &input)
        .await
        .map(Json)
}

pub async fn close_conversation(
    State(state): State<AppState>,
    identity: SupportIdentity,
    Json(input): Json<UpdateSupportConversationInput>,
) -> Result<Json<SupportConversation>, error::HttpError> {
    service::close_conversation(&state.pool, &identity, &input)
        .await
        .map(Json)
}

pub async fn admin_inbox(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Query(query): Query<AdminSupportInboxQuery>,
) -> Result<Json<Paged<SupportInboxItem>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        ADMIN_SUPPORT_PAGE,
        PermissionAction::Read,
        "support",
    )
    .await?;

    service::admin_inbox(&state.pool, &query).await.map(Json)
}

pub async fn admin_thread(
    State(state): State<AppState>,
    Path(conversation_id): Path<i32>,
    identity: AdminIdentity,
    Query(query): Query<SupportMessagesQuery>,
) -> Result<Json<AdminSupportThreadPayload>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        ADMIN_SUPPORT_PAGE,
        PermissionAction::Read,
        "support",
    )
    .await?;

    service::admin_thread(&state.pool, conversation_id, &query)
        .await
        .map(Json)
}

pub async fn post_admin_message(
    State(state): State<AppState>,
    Path(conversation_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<CreateSupportMessageInput>,
) -> Result<Json<SupportMessage>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        ADMIN_SUPPORT_PAGE,
        PermissionAction::Create,
        "support",
    )
    .await?;

    service::post_admin_message(&state.pool, &identity, conversation_id, &input)
        .await
        .map(Json)
}

pub async fn update_admin_conversation(
    State(state): State<AppState>,
    Path(conversation_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateAdminSupportConversationInput>,
) -> Result<Json<SupportConversation>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        ADMIN_SUPPORT_PAGE,
        PermissionAction::Update,
        "support",
    )
    .await?;

    service::update_admin_conversation(&state.pool, &identity, conversation_id, &input)
        .await
        .map(Json)
}
