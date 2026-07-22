use std::{env, io::ErrorKind, net::SocketAddr};

use anyhow::Context;
use online_shopping_api::{app_state::AppState, modules::auth, routes};
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
    let listener = match TcpListener::bind(address).await {
        Ok(listener) => listener,
        Err(error) if error.kind() == ErrorKind::AddrInUse => {
            tracing::warn!(
                "{address} is already in use; selecting an available port automatically"
            );
            TcpListener::bind(SocketAddr::new(address.ip(), 0))
                .await
                .context("failed to bind to an available port")?
        }
        Err(error) => return Err(error).context("failed to bind API listener"),
    };
    let address = listener
        .local_addr()
        .context("failed to determine the API listener address")?;

    tracing::info!("Online Shopping API listening on http://{address}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        let mut terminate =
            match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
                Ok(signal) => signal,
                Err(error) => {
                    tracing::warn!(%error, "unable to listen for SIGTERM; waiting for Ctrl-C");
                    wait_for_ctrl_c().await;
                    return;
                }
            };

        tokio::select! {
            () = wait_for_ctrl_c() => {},
            _ = terminate.recv() => tracing::info!("received SIGTERM, starting graceful shutdown"),
        }
    }

    #[cfg(not(unix))]
    wait_for_ctrl_c().await;
}

async fn wait_for_ctrl_c() {
    match tokio::signal::ctrl_c().await {
        Ok(()) => tracing::info!("received Ctrl-C, starting graceful shutdown"),
        Err(error) => tracing::error!(%error, "failed to listen for Ctrl-C"),
    }
}
