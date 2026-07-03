use std::{env, net::SocketAddr};

use anyhow::Context;
use home_depot_clone_api::{app_state::AppState, modules::auth, routes};
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
        .parse()?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("failed to connect to PostgreSQL")?;

    auth::service::ensure_seed_admin(&pool)
        .await
        .context("failed to ensure seed admin user")?;

    let app = routes::build_router(AppState::new(pool), frontend_origin);

    let address: SocketAddr = format!("{app_host}:{app_port}").parse()?;
    let listener = TcpListener::bind(address).await?;

    tracing::info!("Home Depot clone API listening on http://{address}");
    axum::serve(listener, app).await?;

    Ok(())
}
