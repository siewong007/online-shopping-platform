use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};

use crate::{app_state::AppState, error};

use super::{
    dto::{StorefrontPayload, StorefrontQuery},
    service,
};

pub async fn storefront(
    State(state): State<AppState>,
    Query(query): Query<StorefrontQuery>,
) -> Result<Json<StorefrontPayload>, StatusCode> {
    service::fetch_storefront(&state.pool, &query)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("storefront query failed", error))
}
