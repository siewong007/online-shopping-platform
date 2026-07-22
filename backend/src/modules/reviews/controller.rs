use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{app_state::AppState, error, modules::customer_auth::model::CustomerIdentity};

use super::{dto::CreateReviewInput, model::ProductDetailPayload, service};
use crate::modules::reviews::model::ProductReview;

pub async fn product_detail(
    State(state): State<AppState>,
    identity: Option<CustomerIdentity>,
    Path(product_id): Path<i32>,
) -> Result<Json<ProductDetailPayload>, error::HttpError> {
    let customer_account_id = identity.map(|identity| identity.customer_account_id);
    let payload = service::fetch_product_detail(&state.pool, product_id, customer_account_id)
        .await
        .map_err(|error| error::map_public_query_error("product detail query failed", error))?;

    payload
        .map(Json)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Product not found.".to_string()))
}

pub async fn create_review(
    State(state): State<AppState>,
    identity: CustomerIdentity,
    Path(product_id): Path<i32>,
    Json(input): Json<CreateReviewInput>,
) -> Result<(StatusCode, Json<ProductReview>), error::HttpError> {
    service::create_product_review(
        &state.pool,
        product_id,
        identity.customer_account_id,
        &input,
    )
    .await
    .map(|review| (StatusCode::CREATED, Json(review)))
    .map_err(error::map_admin_error)
}
