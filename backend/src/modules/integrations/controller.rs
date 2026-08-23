use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use sha2::{Digest, Sha256};

use crate::{app_state::AppState, db, error::HttpError, models::AutocountStockPriceReport};

const BEARER: &str = "Bearer ";

pub async fn push_stock_price(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<AutocountStockPriceReport>, HttpError> {
    let expected = match state.autocount_sync_token.as_deref() {
        Some(token) if !token.is_empty() => token,
        _ => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "AutoCount stock/price push is not enabled.".to_string(),
            ));
        }
    };
    let provided = bearer_token(&headers).ok_or((
        StatusCode::UNAUTHORIZED,
        "AutoCount sync token is required.".to_string(),
    ))?;
    if !tokens_match(expected, provided) {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid AutoCount sync token.".to_string(),
        ));
    }

    let report = db::apply_autocount_stock_price(&state.pool, &body)
        .await
        .map_err(|error| {
            tracing::error!("autocount stock/price push failed: {error:?}");
            (StatusCode::BAD_REQUEST, error.to_string())
        })?;

    crate::modules::audit::service::record_event(
        &state.pool,
        "autocount-sync",
        "import",
        "catalogue",
        "stock-price",
        &format!(
            "{} updated, {} unmatched",
            report.products_updated, report.unmatched
        ),
    )
    .await;

    Ok(Json(report))
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    let value = headers
        .get(axum::http::header::AUTHORIZATION)?
        .to_str()
        .ok()?;
    value.strip_prefix(BEARER)
}

fn tokens_match(expected: &str, provided: &str) -> bool {
    let left = Sha256::digest(expected.as_bytes());
    let right = Sha256::digest(provided.as_bytes());
    left == right
}
