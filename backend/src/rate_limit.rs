use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::{
    Json,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::{app_state::AppState, client_ip};

const WINDOW: Duration = Duration::from_secs(60);
const DEFAULT_REQUESTS_PER_MINUTE: u32 = 120;
const SWEEP_THRESHOLD: usize = 4096;

/// Dependency-free fixed-window rate limiter for the public routes, keyed on the trusted
/// client IP. Disabled (all requests allowed) unless a positive `RATE_LIMIT_PER_MINUTE` is
/// configured, mirroring the emailer/MFA "no configuration, no behavior" default.
#[derive(Clone)]
pub struct RateLimiter {
    pub requests_per_minute: u32,
    windows: Arc<Mutex<HashMap<IpAddr, Window>>>,
}

struct Window {
    count: u32,
    started_at: Instant,
}

impl RateLimiter {
    pub fn disabled() -> Self {
        Self {
            requests_per_minute: 0,
            windows: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn from_environment() -> Self {
        let requests_per_minute = match std::env::var("RATE_LIMIT_PER_MINUTE") {
            Ok(raw) => raw.trim().parse().unwrap_or(DEFAULT_REQUESTS_PER_MINUTE),
            Err(_) => DEFAULT_REQUESTS_PER_MINUTE,
        };
        Self {
            requests_per_minute,
            windows: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Returns whether this request is within the current 60-second window for `ip`.
    fn allows(&self, ip: IpAddr) -> bool {
        if self.requests_per_minute == 0 {
            return true;
        }
        let mut windows = self.windows.lock().expect("rate limiter lock");
        // Lazy sweep: once enough clients have been seen, drop expired windows so the map
        // cannot grow without bound.
        if windows.len() > SWEEP_THRESHOLD {
            windows.retain(|_, window| window.started_at.elapsed() < WINDOW);
        }

        let now = Instant::now();
        let window = windows.entry(ip).or_insert_with(|| Window {
            count: 0,
            started_at: now,
        });
        if now.duration_since(window.started_at) >= WINDOW {
            *window = Window {
                count: 0,
                started_at: now,
            };
        }
        window.count += 1;
        window.count <= self.requests_per_minute
    }
}

/// Axum middleware mounting the limiter. Applied only to the unauthenticated public surfaces
/// (`/api/storefront*`, `/api/checkout*`, `/api/customer-portal/lookup`, `/api/account/*`,
/// `/api/support*`) — never to `/api/health`.
pub async fn limit(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    // `client_ip` always yields a validated address string; fall back to the peer regardless.
    let ip = client_ip::client_ip(&headers, peer, state.trust_proxy)
        .parse()
        .unwrap_or_else(|_| peer.ip());
    if !state.rate_limiter.allows(ip) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            [("Retry-After", "60")],
            Json(serde_json::json!({ "error": "Too many requests" })),
        )
            .into_response();
    }
    next.run(request).await
}
