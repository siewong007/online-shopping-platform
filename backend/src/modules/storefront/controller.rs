use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
};

use crate::{app_state::AppState, error};

use super::{
    dto::{StorefrontPayload, StorefrontQuery},
    service,
};

pub async fn storefront(
    State(state): State<AppState>,
    Query(query): Query<StorefrontQuery>,
) -> Result<Json<StorefrontPayload>, StatusCode> {
    service::fetch_storefront(&state.pool, &query)
        .await
        .map(Json)
        .map_err(|error| error::map_query_error("storefront query failed", error))
}

/// The public sitemap: the static pages plus every product page the storefront currently
/// publishes. Served by the API (rather than a checked-in static file) so the product list can
/// never go stale against a live catalogue of thousands of SKUs.
pub async fn sitemap(
    State(state): State<AppState>,
) -> Result<(StatusCode, HeaderMap, String), StatusCode> {
    let origin = std::env::var("PUBLIC_SITE_ORIGIN")
        .unwrap_or_else(|_| "https://ekowayhardware.com".to_string());
    let trimmed_origin = origin.trim_end_matches('/').to_string();

    let product_ids = service::fetch_published_product_ids(&state.pool)
        .await
        .map_err(|error| {
            tracing::error!(%error, "sitemap query failed");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );
    let mut push = |path: &str, priority: &str| {
        xml.push_str(&format!(
            "  <url><loc>{trimmed_origin}{path}</loc><priority>{priority}</priority></url>\n"
        ));
    };
    push("/", "1.0");
    push("/shop", "0.9");
    push("/contact", "0.7");
    push("/delivery", "0.6");
    push("/returns", "0.5");
    push("/terms", "0.3");
    push("/privacy", "0.3");
    for id in product_ids {
        push(&format!("/shop/products/{id}"), "0.7");
    }
    xml.push_str("</urlset>\n");

    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    Ok((StatusCode::OK, headers, xml))
}
