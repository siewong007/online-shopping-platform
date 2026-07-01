use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
};

use crate::{app_state::AppState, error, modules::permissions};

use super::{dto::UpdateSystemSettingInput, model::SystemSetting, service};

pub async fn admin_settings(
    State(state): State<AppState>,
) -> Result<Json<Vec<SystemSetting>>, axum::http::StatusCode> {
    service::fetch_system_settings(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("admin settings query failed", error))
}

pub async fn admin_update_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    headers: HeaderMap,
    Json(input): Json<UpdateSystemSettingInput>,
) -> Result<Json<SystemSetting>, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
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
