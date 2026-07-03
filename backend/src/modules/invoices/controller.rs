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
    dto::{CreateInvoiceFromOrderInput, RecordInvoicePaymentInput, UpdateInvoiceBillingInput},
    model::Invoice,
    service,
};

pub async fn admin_invoices(
    State(state): State<AppState>,
    identity: AdminIdentity,
) -> Result<Json<Vec<Invoice>>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_INVOICES_PAGE,
        permissions::model::PermissionAction::Read,
        "invoice",
    )
    .await?;

    service::fetch_invoices(&state.pool)
        .await
        .map(Json)
        .map_err(|error| error::map_admin_query_error("admin invoices query failed", error))
}

pub async fn admin_create_invoice_from_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<CreateInvoiceFromOrderInput>,
) -> Result<(StatusCode, Json<Invoice>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_INVOICES_PAGE,
        permissions::model::PermissionAction::Create,
        "invoice",
    )
    .await?;

    service::create_invoice_from_order(&state.pool, order_id, &input)
        .await
        .map(|invoice| (StatusCode::CREATED, Json(invoice)))
        .map_err(error::map_admin_error)
}

pub async fn admin_update_invoice_billing(
    State(state): State<AppState>,
    Path(invoice_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<UpdateInvoiceBillingInput>,
) -> Result<Json<Invoice>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_INVOICES_PAGE,
        permissions::model::PermissionAction::Update,
        "invoice",
    )
    .await?;

    service::update_invoice_billing(&state.pool, invoice_id, &input)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_void_invoice(
    State(state): State<AppState>,
    Path(invoice_id): Path<i32>,
    identity: AdminIdentity,
) -> Result<Json<Invoice>, error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_INVOICES_PAGE,
        permissions::model::PermissionAction::Update,
        "invoice",
    )
    .await?;

    service::void_invoice(&state.pool, invoice_id)
        .await
        .map(Json)
        .map_err(error::map_admin_error)
}

pub async fn admin_record_invoice_payment(
    State(state): State<AppState>,
    Path(invoice_id): Path<i32>,
    identity: AdminIdentity,
    Json(input): Json<RecordInvoicePaymentInput>,
) -> Result<(StatusCode, Json<Invoice>), error::HttpError> {
    permissions::service::ensure_permission(
        &state.pool,
        &identity,
        permissions::model::ADMIN_INVOICES_PAGE,
        permissions::model::PermissionAction::Update,
        "invoice",
    )
    .await?;

    service::record_invoice_payment(&state.pool, invoice_id, &input)
        .await
        .map(|invoice| (StatusCode::CREATED, Json(invoice)))
        .map_err(error::map_admin_error)
}
