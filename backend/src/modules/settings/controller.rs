use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{dto::UpdateSystemSettingInput, model::SystemSetting, service};

pub async fn admin_settings(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<SystemSetting>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SETTINGS_PAGE,
        permissions::model::PermissionAction::Read,
        "setting",
    )
    .await?;

    service::fetch_system_settings(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin settings query failed", error))
}

pub async fn admin_update_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    identity: AdminIdentity,
    Json(input): Json<UpdateSystemSettingInput>,
) -> Result<Json<SystemSetting>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_SETTINGS_PAGE,
        permissions::model::PermissionAction::Update,
        "setting",
    )
    .await?;

    service::update_system_setting(&state.pool, &key, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
