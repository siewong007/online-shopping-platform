mod db;
mod models;

use std::{env, net::SocketAddr};

use anyhow::Context;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, header::CONTENT_TYPE},
    routing::{get, post, put},
};
use serde::Serialize;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

const ADMIN_ORDERS_PAGE: &str = "admin-orders";
const ADMIN_CATALOG_PAGE: &str = "admin-catalog";
const ADMIN_CUSTOMERS_PAGE: &str = "admin-customers";
const ADMIN_PERMISSIONS_PAGE: &str = "admin-permissions";
const ADMIN_ROLE_HEADER: &str = "x-admin-role-id";

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    rust_target: &'static str,
    react_target: &'static str,
    postgres_target: &'static str,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,tower_http=info")),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
    let app_host = env::var("APP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let app_port = env::var("APP_PORT").unwrap_or_else(|_| "4000".to_string());
    let frontend_origin = env::var("FRONTEND_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:5173".to_string())
        .parse::<HeaderValue>()?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("failed to connect to PostgreSQL")?;

    let admin_role_header = HeaderName::from_static(ADMIN_ROLE_HEADER);
    let cors = CorsLayer::new().allow_origin(frontend_origin);
    let cors = cors
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([CONTENT_TYPE, admin_role_header]);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/storefront", get(storefront))
        .route("/api/admin/dashboard", get(admin_dashboard))
        .route(
            "/api/admin/orders",
            get(admin_orders).post(admin_create_order),
        )
        .route(
            "/api/admin/orders/{order_id}",
            put(admin_update_order).delete(admin_delete_order),
        )
        .route(
            "/api/admin/customer-portal",
            get(customer_portal_profiles).post(create_customer_portal_profile),
        )
        .route(
            "/api/admin/customer-portal/{profile_id}",
            put(update_customer_portal_profile).delete(delete_customer_portal_profile),
        )
        .route("/api/admin/permissions", get(admin_permissions))
        .route("/api/admin/roles", post(create_role))
        .route(
            "/api/admin/roles/{role_id}",
            put(update_role).delete(delete_role),
        )
        .route("/api/admin/role-permissions", put(update_role_permission))
        .route("/api/admin/categories", post(create_category))
        .route("/api/admin/products", post(create_product))
        .route("/api/checkout", post(checkout))
        .with_state(AppState { pool })
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let address: SocketAddr = format!("{app_host}:{app_port}").parse()?;
    let listener = TcpListener::bind(address).await?;

    tracing::info!("Home Depot clone API listening on http://{address}");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        rust_target: "1.95.0",
        react_target: "19.2.0",
        postgres_target: "18.3",
    })
}

async fn storefront(
    State(state): State<AppState>,
) -> Result<Json<models::StorefrontPayload>, axum::http::StatusCode> {
    db::fetch_storefront(&state.pool)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::error!("storefront query failed: {error:?}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn admin_dashboard(
    State(state): State<AppState>,
) -> Result<Json<models::AdminDashboardPayload>, axum::http::StatusCode> {
    db::fetch_admin_dashboard(&state.pool)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::error!("admin dashboard query failed: {error:?}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn create_category(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::CreateCategoryInput>,
) -> Result<(StatusCode, Json<models::Category>), (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_CATALOG_PAGE,
        db::PermissionAction::Create,
        "catalog",
    )
    .await?;

    db::create_category(&state.pool, &input)
        .await
        .map(|category| (StatusCode::CREATED, Json(category)))
        .map_err(map_admin_error)
}

async fn create_product(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::CreateProductInput>,
) -> Result<(StatusCode, Json<models::Product>), (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_CATALOG_PAGE,
        db::PermissionAction::Create,
        "catalog",
    )
    .await?;

    db::create_product(&state.pool, &input)
        .await
        .map(|product| (StatusCode::CREATED, Json(product)))
        .map_err(map_admin_error)
}

async fn admin_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<models::Order>>, axum::http::StatusCode> {
    db::fetch_orders(&state.pool)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::error!("admin orders query failed: {error:?}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn admin_create_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::CreateOrderInput>,
) -> Result<(StatusCode, Json<models::Order>), (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_ORDERS_PAGE,
        db::PermissionAction::Create,
        "order",
    )
    .await?;

    db::create_order(&state.pool, &input)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(map_admin_error)
}

async fn admin_update_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<models::CreateOrderInput>,
) -> Result<Json<models::Order>, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_ORDERS_PAGE,
        db::PermissionAction::Update,
        "order",
    )
    .await?;

    db::update_order(&state.pool, order_id, &input)
        .await
        .map(Json)
        .map_err(map_admin_error)
}

async fn admin_delete_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_ORDERS_PAGE,
        db::PermissionAction::Delete,
        "order",
    )
    .await?;

    db::delete_order(&state.pool, order_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(map_admin_error)
}

async fn customer_portal_profiles(
    State(state): State<AppState>,
) -> Result<Json<Vec<models::CustomerPortalProfile>>, axum::http::StatusCode> {
    db::fetch_customer_portal_profiles(&state.pool)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::error!("customer portal query failed: {error:?}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn create_customer_portal_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::CreateCustomerPortalProfileInput>,
) -> Result<(StatusCode, Json<models::CustomerPortalProfile>), (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_CUSTOMERS_PAGE,
        db::PermissionAction::Create,
        "customer",
    )
    .await?;

    db::create_customer_portal_profile(&state.pool, &input)
        .await
        .map(|profile| (StatusCode::CREATED, Json(profile)))
        .map_err(map_admin_error)
}

async fn update_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<models::UpdateCustomerPortalProfileInput>,
) -> Result<Json<models::CustomerPortalProfile>, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_CUSTOMERS_PAGE,
        db::PermissionAction::Update,
        "customer",
    )
    .await?;

    db::update_customer_portal_profile(&state.pool, profile_id, &input)
        .await
        .map(Json)
        .map_err(map_admin_error)
}

async fn delete_customer_portal_profile(
    State(state): State<AppState>,
    Path(profile_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_CUSTOMERS_PAGE,
        db::PermissionAction::Delete,
        "customer",
    )
    .await?;

    db::delete_customer_portal_profile(&state.pool, profile_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(map_admin_error)
}

async fn checkout(
    State(state): State<AppState>,
    Json(input): Json<models::CreateOrderInput>,
) -> Result<(StatusCode, Json<models::Order>), (StatusCode, String)> {
    db::create_order(&state.pool, &input)
        .await
        .map(|order| (StatusCode::CREATED, Json(order)))
        .map_err(map_admin_error)
}

async fn ensure_admin_permission(
    pool: &PgPool,
    headers: &HeaderMap,
    page_slug: &str,
    action: db::PermissionAction,
    resource_name: &str,
) -> Result<(), (StatusCode, String)> {
    let role_id = headers
        .get(ADMIN_ROLE_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i32>().ok())
        .ok_or_else(|| {
            (
                StatusCode::FORBIDDEN,
                format!("Select an admin role before changing {resource_name} records."),
            )
        })?;

    let is_allowed = db::role_has_page_permission(pool, role_id, page_slug, action)
        .await
        .map_err(|error| {
            tracing::error!("permission lookup failed: {error:?}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unable to verify admin permissions.".to_string(),
            )
        })?;

    if is_allowed {
        Ok(())
    } else {
        Err((
            StatusCode::FORBIDDEN,
            format!("This admin role does not have enough {resource_name} privileges."),
        ))
    }
}

async fn admin_permissions(
    State(state): State<AppState>,
) -> Result<Json<models::PermissionsPayload>, axum::http::StatusCode> {
    db::fetch_permissions(&state.pool)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::error!("permissions query failed: {error:?}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn create_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::CreateRoleInput>,
) -> Result<(StatusCode, Json<models::Role>), (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_PERMISSIONS_PAGE,
        db::PermissionAction::Create,
        "permission",
    )
    .await?;

    db::create_role(&state.pool, &input)
        .await
        .map(|role| (StatusCode::CREATED, Json(role)))
        .map_err(map_admin_error)
}

async fn update_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    headers: HeaderMap,
    Json(input): Json<models::UpdateRoleInput>,
) -> Result<Json<models::Role>, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_PERMISSIONS_PAGE,
        db::PermissionAction::Update,
        "permission",
    )
    .await?;

    db::update_role(&state.pool, role_id, &input)
        .await
        .map(Json)
        .map_err(map_admin_error)
}

async fn delete_role(
    State(state): State<AppState>,
    Path(role_id): Path<i32>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_PERMISSIONS_PAGE,
        db::PermissionAction::Delete,
        "permission",
    )
    .await?;

    db::delete_role(&state.pool, role_id)
        .await
        .map(|()| StatusCode::NO_CONTENT)
        .map_err(map_admin_error)
}

async fn update_role_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<models::UpdateRolePagePermissionInput>,
) -> Result<Json<models::RolePagePermission>, (StatusCode, String)> {
    ensure_admin_permission(
        &state.pool,
        &headers,
        ADMIN_PERMISSIONS_PAGE,
        db::PermissionAction::Update,
        "permission",
    )
    .await?;

    db::update_role_page_permission(&state.pool, &input)
        .await
        .map(Json)
        .map_err(map_admin_error)
}

fn map_admin_error(error: anyhow::Error) -> (StatusCode, String) {
    tracing::error!("admin mutation failed: {error:?}");
    (StatusCode::BAD_REQUEST, error.to_string())
}
