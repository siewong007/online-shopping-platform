mod db;
mod models;

use std::{env, net::SocketAddr};

use anyhow::Context;
use axum::{
    extract::State,
    http::{header::CONTENT_TYPE, HeaderValue, Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

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
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("info,tower_http=info")
            }),
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

    let cors = CorsLayer::new().allow_origin(frontend_origin);
    let cors = cors
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([CONTENT_TYPE]);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/storefront", get(storefront))
        .route("/api/admin/dashboard", get(admin_dashboard))
        .route("/api/admin/categories", post(create_category))
        .route("/api/admin/products", post(create_product))
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
    Json(input): Json<models::CreateCategoryInput>,
) -> Result<(StatusCode, Json<models::Category>), (StatusCode, String)> {
    db::create_category(&state.pool, &input)
        .await
        .map(|category| (StatusCode::CREATED, Json(category)))
        .map_err(map_admin_error)
}

async fn create_product(
    State(state): State<AppState>,
    Json(input): Json<models::CreateProductInput>,
) -> Result<(StatusCode, Json<models::Product>), (StatusCode, String)> {
    db::create_product(&state.pool, &input)
        .await
        .map(|product| (StatusCode::CREATED, Json(product)))
        .map_err(map_admin_error)
}

fn map_admin_error(error: anyhow::Error) -> (StatusCode, String) {
    tracing::error!("admin mutation failed: {error:?}");
    (StatusCode::BAD_REQUEST, error.to_string())
}
