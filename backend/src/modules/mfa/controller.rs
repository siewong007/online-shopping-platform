use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error, models::AdminIdentity, modules::auth::service};

use super::{dto, service as mfa_service};

#[derive(serde::Serialize)]
pub struct AdminMfaStatus {
    pub enabled: bool,
}

pub async fn status(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<AdminMfaStatus>, error::HttpError> {
    let factor = crate::db::fetch_active_admin_factor(&state.pool, identity.user_id)
        .await
        .map_err(|err| {
            tracing::error!(%err, "admin MFA status lookup failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Multi-factor status is unavailable.".to_string(),
            )
        })?;
    Ok(Json(AdminMfaStatus {
        enabled: factor.is_some(),
    }))
}

pub async fn login_verify(
    State(state): State<AppState>,
    Json(input): Json<dto::AdminMfaLoginVerifyInput>,
) -> Result<Json<crate::models::AdminAuthPayload>, error::HttpError> {
    mfa_service::complete_login(&state.pool, &state.mfa, &input)
        .await
        .map(Json)
}

pub async fn begin_enrollment(
    State(state): State<AppState>,
    identity: AdminIdentity,
    headers: HeaderMap,
) -> Result<Json<dto::AdminMfaEnrollmentStart>, error::HttpError> {
    if !state.mfa.is_enabled() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Multi-factor authentication is not configured on this deployment.".to_string(),
        ));
    }
    let _bearer_token = service::bearer_token_from_headers(&headers)?;
    mfa_service::begin_enrollment(&state.pool, &identity, &state.mfa)
        .await
        .map(Json)
}

pub async fn confirm_enrollment(
    State(state): State<AppState>,
    identity: AdminIdentity,
    headers: HeaderMap,
    Json(input): Json<dto::AdminMfaEnrollmentConfirmInput>,
) -> Result<Json<dto::AdminMfaRecoveryCodes>, error::HttpError> {
    if !state.mfa.is_enabled() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Multi-factor authentication is not configured on this deployment.".to_string(),
        ));
    }
    let bearer_token = service::bearer_token_from_headers(&headers)?.to_string();
    mfa_service::confirm_enrollment(
        &state.pool,
        &identity,
        &state.mfa,
        &bearer_token,
        &input.code,
    )
    .await
    .map(Json)
}

pub async fn disable_factor(
    State(state): State<AppState>,
    identity: AdminIdentity,
    headers: HeaderMap,
    Json(input): Json<dto::AdminMfaDisableInput>,
) -> Result<StatusCode, error::HttpError> {
    let _bearer_token = service::bearer_token_from_headers(&headers)?;
    mfa_service::disable_factor(&state.pool, &identity, &state.mfa, &input).await?;
    Ok(StatusCode::NO_CONTENT)
}
