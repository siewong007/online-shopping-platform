pub use crate::models::{CreatePaymentInput, UpdatePaymentInput};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RefundPaymentInput {
    pub amount_cents: Option<i32>,
    pub idempotency_key: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct CreateActivationGrantInput {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub expires_in_minutes: Option<i32>,
}

/// Carries the raw authorization secret to the issuing operator and nowhere else: it is not
/// stored, not logged, and cannot be read back once this response is gone.
#[derive(Debug, Clone, serde::Serialize)]
pub struct IssuedActivationGrant {
    pub id: i64,
    pub label: String,
    pub expires_at: String,
    pub authorization: String,
}
