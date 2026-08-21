use std::net::{IpAddr, SocketAddr};

use axum::http::HeaderMap;

/// Best-effort client address for rate-limit ledgers. Behind the Caddy proxy the rightmost
/// parseable X-Forwarded-For entry is the address Caddy itself observed — client-supplied
/// entries sit to its left, so scanning from the right defeats header spoofing. Direct
/// (unproxied) access falls back to the socket peer.
pub fn client_ip(headers: &HeaderMap, peer: SocketAddr) -> String {
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
