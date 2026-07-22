use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error};

use super::{
    dto::{CustomerAuthPayload, CustomerLoginInput, CustomerMePayload, CustomerRegisterInput},
    model::CustomerIdentity,
    service,
};

pub async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CustomerRegisterInput>,
) -> Result<(StatusCode, Json<CustomerAuthPayload>), error::HttpError> {
    service::register(&state.pool, &input, user_agent(&headers).as_deref())
        .await
        .map(|payload| (StatusCode::CREATED, Json(payload)))
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CustomerLoginInput>,
) -> Result<Json<CustomerAuthPayload>, error::HttpError> {
    service::login(&state.pool, &input, user_agent(&headers).as_deref())
        .await
        .map(Json)
}

pub async fn logout(
    State(state): State<AppState>,
    _identity: CustomerIdentity,
    headers: HeaderMap,
) -> Result<StatusCode, error::HttpError> {
    service::logout(&state.pool, &headers)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}

pub async fn me(
    State(state): State<AppState>,
    identity: CustomerIdentity,
) -> Result<Json<CustomerMePayload>, error::HttpError> {
    service::me(&state.pool, &identity).await.map(Json)
}

pub async fn sessions(
    State(state): State<AppState>,
    identity: CustomerIdentity,
) -> Result<Json<Vec<super::dto::CustomerSessionView>>, error::HttpError> {
    service::sessions(&state.pool, &identity).await.map(Json)
}

pub async fn logout_session(
    State(state): State<AppState>,
    identity: CustomerIdentity,
    Path(session_id): Path<i32>,
) -> Result<StatusCode, error::HttpError> {
    service::logout_session(&state.pool, &identity, session_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}

pub async fn logout_other_sessions(
    State(state): State<AppState>,
    identity: CustomerIdentity,
) -> Result<StatusCode, error::HttpError> {
    service::logout_other_sessions(&state.pool, &identity)
        .await
        .map(|()| StatusCode::NO_CONTENT)
}

fn user_agent(headers: &HeaderMap) -> Option<String> {
    headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.chars().take(512).collect())
}
