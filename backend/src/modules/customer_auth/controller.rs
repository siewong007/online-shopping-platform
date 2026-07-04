use axum::{
    Json,
    extract::State,
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
    Json(input): Json<CustomerRegisterInput>,
) -> Result<(StatusCode, Json<CustomerAuthPayload>), error::HttpError> {
    service::register(&state.pool, &input)
        .await
        .map(|payload| (StatusCode::CREATED, Json(payload)))
}

pub async fn login(
    State(state): State<AppState>,
    Json(input): Json<CustomerLoginInput>,
) -> Result<Json<CustomerAuthPayload>, error::HttpError> {
    service::login(&state.pool, &input).await.map(Json)
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
