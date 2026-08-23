use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error};

use super::{
    dto::{AdminAuthPayload, AdminLoginInput, AdminMePayload},
    model::AdminIdentity,
    service,
};

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<AdminLoginInput>,
) -> Result<Json<AdminAuthPayload>, error::HttpError> {
    let client_key = service::client_key_from_headers(&headers);
    service::login(&state.pool, &input, &client_key)
        .await
        .map(Json)
}

pub async fn logout(
    State(state): State<AppState>,
    identity: AdminIdentity,
    headers: HeaderMap,
) -> Result<StatusCode, error::HttpError> {
    service::logout(&state.pool, &identity, &headers)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}

pub async fn me(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<AdminMePayload>, error::HttpError> {
    service::me(&state.pool, &identity).await.map(Json)
}
