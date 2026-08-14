use axum::{Json, extract::State, http::StatusCode};

use crate::{app_state::AppState, error};

use super::dto::HealthResponse;

pub async fn health(
    State(state): State<AppState>,
) -> Result<Json<HealthResponse>, error::HttpError> {
    // This is a readiness check, not merely a process check. A previous production release
    // returned 200 here while storefront queries failed because a migration was missing.
    // Keep the probe cheap while touching the critical schema used by catalogue, checkout,
    // payment capture and stock recovery.
    sqlx::query(
        r#"
        SELECT payments.provider,
               payments.provider_request_id,
               orders.stock_released_at,
               orders.stock_reacquired_at,
               products.source_item_code,
               product_reviews.id
        FROM payments
        CROSS JOIN orders
        CROSS JOIN products
        LEFT JOIN product_reviews ON product_reviews.product_id = products.id
        LIMIT 0
        "#,
    )
    .execute(&state.pool)
    .await
    .map_err(|health_error| {
        tracing::error!(%health_error, "readiness schema check failed");
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "Service is not ready.".to_string(),
        )
    })?;

    Ok(Json(HealthResponse {
        status: "ok",
        rust_target: "1.95.0",
        react_target: "19.2.7",
        postgres_target: "19beta1",
    }))
}
