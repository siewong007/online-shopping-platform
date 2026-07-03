use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::{app_state::AppState, error, modules::permissions};

use super::{
    dto::{CreateCategoryInput, CreateProductInput, UpdateProductInput},
    model::{Category, Product},
    service,
};

pub async fn create_category(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateCategoryInput>,
) -> Result<(StatusCode, Json<Category>), error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Create,
        "catalog",
    )
    .await?;

    service::create_category(&state.pool, &input)
        .await
        .map(|category| (StatusCode::CREATED, Json(category)))
        .map_err(error::map_admin_error)
}

pub async fn create_product(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreateProductInput>,
) -> Result<(StatusCode, Json<Product>), error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Create,
        "catalog",
    )
    .await?;

    service::create_product(&state.pool, &input)
        .await
        .map(|product| (StatusCode::CREATED, Json(product)))
        .map_err(error::map_admin_error)
}

pub async fn update_product(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<i32>,
    Json(input): Json<UpdateProductInput>,
) -> Result<Json<Product>, error::HttpError> {
    permissions::service::ensure_admin_permission(
        &state.pool,
        &headers,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Update,
        "catalog",
    )
    .await?;

    service::update_product(&state.pool, product_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}
