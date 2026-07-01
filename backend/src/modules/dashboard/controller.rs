use axum::{Json, extract::State, http::StatusCode};

use crate::{app_state::AppState, error};

use super::{dto::AdminDashboardPayload, service};

pub async fn admin_dashboard(
    State(state): State<AppState>,
) -> Result<Json<AdminDashboardPayload>, StatusCode> {
    service::fetch_admin_dashboard(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("admin dashboard query failed", error))
}
