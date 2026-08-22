use std::{env, io::ErrorKind, net::SocketAddr, time::Duration};

use anyhow::Context;
use online_shopping_api::{
    app_state::AppState,
    db,
    modules::{auth, payments::activation::PaymentActivationMode},
    routes,
};
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
    // Resolved once, before the listener exists: a typo in the setting stops the process instead
    // of becoming a runtime rejection nobody investigates. An unset setting is `disabled`.
    let payment_activation_mode = PaymentActivationMode::from_environment()
        .context("PAYMENT_ACTIVATION_MODE must be `disabled`, `controlled` or `public`")?;
    let emailer = online_shopping_api::emailer::Emailer::from_environment()
        .context("transactional email configuration is invalid")?;
    let mfa = online_shopping_api::modules::mfa::service::MfaConfig::from_environment()
        .context("MFA_ENCRYPTION_KEY is invalid")?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("failed to connect to PostgreSQL")?;

    auth::service::ensure_seed_admin(&pool)
        .await
        .context("failed to ensure seed admin user")?;

    spawn_abandoned_stock_sweep(pool.clone());

    tracing::info!(
        mode = payment_activation_mode.as_str(),
        "payment activation gate resolved"
    );
    tracing::info!(
        enabled = emailer.is_enabled(),
        "transactional email resolved"
    );
    tracing::info!(
        enabled = mfa.is_enabled(),
        "admin multi-factor authentication resolved"
    );
    let app = routes::build_router(
        AppState::with_payment_activation_mode(pool, payment_activation_mode)
            .with_emailer(emailer)
            .with_mfa(mfa),
        frontend_origin,
    );

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
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

/// Periodically returns stock held by abandoned, never-paid orders using the 60-minute seeded
/// default. Setting `inventory.unpaid_release_minutes` to 0 keeps the ticker running but makes
/// each release pass a no-op.
fn spawn_abandoned_stock_sweep(pool: sqlx::PgPool) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(300));

        loop {
            ticker.tick().await;

            match db::release_abandoned_order_stock(&pool).await {
                Ok(0) => {}
                Ok(released) => {
                    tracing::info!("released held stock for {released} abandoned order(s)");
                }
                Err(error) => {
                    tracing::warn!(%error, "abandoned-order stock sweep failed");
                }
            }
        }
    });
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
