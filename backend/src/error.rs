use axum::http::StatusCode;

pub type HttpError = (StatusCode, String);

pub fn map_query_error(context: &str, error: anyhow::Error) -> StatusCode {
    tracing::error!("{context}: {error:?}");
    StatusCode::INTERNAL_SERVER_ERROR
}

pub fn map_admin_error(error: anyhow::Error) -> HttpError {
    tracing::error!("admin mutation failed: {error:?}");
    (StatusCode::BAD_REQUEST, error.to_string())
}

pub fn map_admin_query_error(context: &str, error: anyhow::Error) -> HttpError {
    tracing::error!("{context}: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to load admin records.".to_string(),
    )
}

pub fn map_public_query_error(context: &str, error: anyhow::Error) -> HttpError {
    tracing::error!("{context}: {error:?}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to load customer records.".to_string(),
    )
}
