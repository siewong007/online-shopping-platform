use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{app_state::AppState, error, modules::auth::model::AdminIdentity};

use super::{
    dto::{
        AdminResetPasswordInput, ChangeOwnPasswordInput, CreateAdminUserInput,
        SetAdminUserActiveInput, UpdateAdminUserProfileInput,
    },
    model::AdminUser,
    service,
};

pub async fn list_users(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<AdminUser>>, error::HttpError> {
    service::list_users(&state.pool, &identity).await.map(Json)
}

pub async fn create_user(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateAdminUserInput>,
) -> Result<(StatusCode, Json<AdminUser>), error::HttpError> {
    service::create_user(&state.pool, &identity, &input)
        .await
        .map(|user| (StatusCode::CREATED, Json(user)))
}

pub async fn update_profile(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(user_id): Path<i32>,
    Json(input): Json<UpdateAdminUserProfileInput>,
) -> Result<Json<AdminUser>, error::HttpError> {
    service::update_profile(&state.pool, &identity, user_id, &input)
        .await
        .map(Json)
}

pub async fn set_active(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(user_id): Path<i32>,
    Json(input): Json<SetAdminUserActiveInput>,
) -> Result<Json<AdminUser>, error::HttpError> {
    service::set_active(&state.pool, &identity, user_id, &input)
        .await
        .map(Json)
}

pub async fn admin_reset_password(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(user_id): Path<i32>,
    Json(input): Json<AdminResetPasswordInput>,
) -> Result<StatusCode, error::HttpError> {
    service::admin_reset_password(&state.pool, &identity, user_id, &input)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}

pub async fn change_own_password(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<ChangeOwnPasswordInput>,
) -> Result<StatusCode, error::HttpError> {
    service::change_own_password(&state.pool, &identity, &input)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}
