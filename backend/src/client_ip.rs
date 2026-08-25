use std::net::{IpAddr, SocketAddr};

use axum::http::HeaderMap;

/// Best-effort client address for rate-limit ledgers. When the deployment trusts its reverse
/// proxy, the rightmost parseable X-Forwarded-For entry is the address Caddy itself observed —
/// client-supplied entries sit to its left, so scanning from the right defeats header spoofing.
/// Direct (unproxied) access falls back to the socket peer. With `TRUST_PROXY=false|0` the
/// header chain is never trusted and the socket peer is always used.
pub fn client_ip(headers: &HeaderMap, peer: SocketAddr, trust_proxy: bool) -> String {
    if !trust_proxy {
        return peer.ip().to_string();
    }

    headers
        .get_all("x-forwarded-for")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.rsplit(','))
        .map(str::trim)
        .find(|entry| entry.parse::<IpAddr>().is_ok())
        .map(str::to_string)
        .unwrap_or_else(|| peer.ip().to_string())
}

/// Resolved once at startup: `TRUST_PROXY=false|0` marks the deployment as directly exposed;
/// anything else (including an unset variable) keeps trusting the proxy's forwarded chain.
pub fn trust_proxy_from_environment() -> bool {
    match std::env::var("TRUST_PROXY") {
        Ok(value) => !matches!(value.trim().to_ascii_lowercase().as_str(), "false" | "0"),
        Err(_) => true,
    }
}
