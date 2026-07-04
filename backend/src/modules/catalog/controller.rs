use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{
    app_state::AppState,
    error,
    modules::{auth::model::AdminIdentity, permissions},
};

use super::{
    dto::{
        CreateCategoryInput, CreateProductInput, UpdateCategoryInput, UpdateProductInput,
        UpdateProductStockInput,
    },
    model::{AdminCatalogPayload, Category, Product, ProductRestockResult},
    service,
};

pub async fn admin_catalog(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<AdminCatalogPayload>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Read,
        "catalog",
    )
    .await?;

    service::fetch_admin_catalog(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin catalog query failed", error))
}

pub async fn create_category(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateCategoryInput>,
) -> Result<(StatusCode, Json<Category>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Create,
        "catalog",
    )
    .await?;

    service::create_category(&state.pool, &identity, &input)
        .await
        .map(|category| (StatusCode::CREATED, Json(category)))
        .map_err(error::map_admin_error)
}

pub async fn update_category(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(slug): Path<String>,
    Json(input): Json<UpdateCategoryInput>,
) -> Result<Json<Category>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Update,
        "catalog",
    )
    .await?;

    service::update_category(&state.pool, &identity, &slug, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_category(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(slug): Path<String>,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Delete,
        "catalog",
    )
    .await?;

    service::delete_category(&state.pool, &identity, &slug)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn create_product(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Json(input): Json<CreateProductInput>,
) -> Result<(StatusCode, Json<Product>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Create,
        "catalog",
    )
    .await?;

    service::create_product(&state.pool, &identity, &input)
        .await
        .map(|product| (StatusCode::CREATED, Json(product)))
        .map_err(error::map_admin_error)
}

pub async fn update_product(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(product_id): Path<i32>,
    Json(input): Json<UpdateProductInput>,
) -> Result<Json<Product>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Update,
        "catalog",
    )
    .await?;

    service::update_product(&state.pool, &identity, product_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn delete_product(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(product_id): Path<i32>,
) -> Result<StatusCode, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Delete,
        "catalog",
    )
    .await?;

    service::delete_product(&state.pool, &identity, product_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(error::map_admin_error)
}

pub async fn update_product_stock(
    State(state): State<AppState>,
    identity: AdminIdentity,
    Path(product_id): Path<i32>,
    Json(input): Json<UpdateProductStockInput>,
) -> Result<Json<Product>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_CATALOG_PAGE,
        permissions::model::PermissionAction::Update,
        "catalog",
    )
    .await?;

    service::update_product_stock(&state.pool, &identity, product_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn supplier_sync(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<ProductRestockResult>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_OVERVIEW_PAGE,
        permissions::model::PermissionAction::Update,
        "inventory",
    )
    .await?;

    service::run_supplier_sync(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("supplier sync failed", error))
}
