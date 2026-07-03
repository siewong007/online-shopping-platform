use axum::{Json, extract::State};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{dto::AdminDashboardPayload, service};

pub async fn admin_dashboard(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<AdminDashboardPayload>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_OVERVIEW_PAGE,
        permissions::model::PermissionAction::Read,
        "dashboard",
    )
    .await?;

    service::fetch_admin_dashboard(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin dashboard query failed", error))
}
