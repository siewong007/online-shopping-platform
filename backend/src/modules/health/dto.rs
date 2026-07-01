use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub rust_target: &'static str,
    pub react_target: &'static str,
    pub postgres_target: &'static str,
}
