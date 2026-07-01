use axum::{Json, extract::State, http::StatusCode};

use crate::{app_state::AppState, error};

use super::{dto::StorefrontPayload, service};

pub async fn storefront(
    State(state): State<AppState>,
) -> Result<Json<StorefrontPayload>, StatusCode> {
    service::fetch_storefront(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("storefront query failed", error))
}
