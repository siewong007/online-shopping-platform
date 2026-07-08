use axum::Json;

use super::dto::HealthResponse;

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        rust_target: "1.95.0",
        react_target: "19.2.7",
        postgres_target: "19beta1",
    })
}
