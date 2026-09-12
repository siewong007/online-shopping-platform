use std::{net::SocketAddr, time::Duration};

use axum::{
    Json,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde::Deserialize;

use crate::{app_state::AppState, client_ip};

const DEFAULT_SITEVERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_HEADER: &str = "cf-turnstile-token";
const SITEVERIFY_TIMEOUT: Duration = Duration::from_secs(5);

/// Cloudflare Turnstile gate for the unauthenticated POST surfaces. Disabled unless a secret
/// is configured, mirroring the emailer/MFA "no configuration, no behavior" default — a
/// deployment without keys accepts every request exactly as before.
#[derive(Clone)]
pub struct TurnstileConfig {
    secret: Option<String>,
    siteverify_url: String,
    client: reqwest::Client,
}

#[derive(Deserialize)]
struct SiteverifyResponse {
    success: bool,
}

impl TurnstileConfig {
    pub fn disabled() -> Self {
        Self::resolve(None, None)
    }

    pub fn from_environment() -> Self {
        Self::resolve(
            std::env::var("TURNSTILE_SECRET_KEY").ok().as_deref(),
            std::env::var("TURNSTILE_SITEVERIFY_URL").ok().as_deref(),
        )
    }

    /// Pure resolution kept away from `std::env` so tests never mutate the process
    /// environment. A blank secret disables verification; a blank URL falls back to
    /// Cloudflare's endpoint (the override exists for stub verifiers in tests).
    pub fn resolve(secret: Option<&str>, siteverify_url: Option<&str>) -> Self {
        let secret = secret
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        let siteverify_url = siteverify_url
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(DEFAULT_SITEVERIFY_URL)
            .to_string();
        let client = reqwest::Client::builder()
            .timeout(SITEVERIFY_TIMEOUT)
            .build()
            .unwrap_or_default();
        Self {
            secret,
            siteverify_url,
            client,
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.secret.is_some()
    }

    async fn verify_token(&self, token: &str, remote_ip: &str) -> anyhow::Result<bool> {
        let secret = self.secret.as_deref().expect("enabled config has a secret");
        let response = self
            .client
            .post(&self.siteverify_url)
            .form(&[
                ("secret", secret),
                ("response", token),
                ("remoteip", remote_ip),
            ])
            .send()
            .await?
            .json::<SiteverifyResponse>()
            .await?;
        Ok(response.success)
    }
}

/// Rejects protected POSTs that arrive without a valid Turnstile token. Mounted per-route
/// (alongside `rate_limit::limit`) on login, register, checkout, review and support surfaces;
/// non-POST requests on shared routes pass through untouched.
pub async fn verify(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    if request.method() != Method::POST || !state.turnstile.is_enabled() {
        return next.run(request).await;
    }

    let token = headers
        .get(TOKEN_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let Some(token) = token else {
        return reject(
            StatusCode::BAD_REQUEST,
            "TURNSTILE_REQUIRED",
            "Bot verification is required.",
        );
    };

    let remote_ip = client_ip::client_ip(&headers, peer, state.trust_proxy);
    match state.turnstile.verify_token(token, &remote_ip).await {
        Ok(true) => next.run(request).await,
        Ok(false) => reject(
            StatusCode::FORBIDDEN,
            "TURNSTILE_FAILED",
            "Bot verification failed. Try again.",
        ),
        // Fail closed on an upstream outage: a verification service we cannot reach must not
        // silently open the protected surface.
        Err(error) => {
            tracing::warn!(%error, "turnstile siteverify request failed");
            reject(
                StatusCode::SERVICE_UNAVAILABLE,
                "TURNSTILE_UNAVAILABLE",
                "Verification is temporarily unavailable. Try again shortly.",
            )
        }
    }
}

fn reject(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({ "error": message, "code": code })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_disables_on_missing_or_blank_secret() {
        assert!(!TurnstileConfig::resolve(None, None).is_enabled());
        assert!(!TurnstileConfig::resolve(Some("   "), None).is_enabled());
    }

    #[test]
    fn resolve_enables_with_secret_and_defaults_url() {
        let config = TurnstileConfig::resolve(Some("  secret  "), None);
        assert!(config.is_enabled());
        assert_eq!(config.siteverify_url, DEFAULT_SITEVERIFY_URL);
    }

    #[test]
    fn resolve_honours_url_override() {
        let config = TurnstileConfig::resolve(Some("s"), Some("http://127.0.0.1:9/v"));
        assert_eq!(config.siteverify_url, "http://127.0.0.1:9/v");
    }
}
