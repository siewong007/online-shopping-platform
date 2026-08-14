pub use crate::models::{CreatePaymentInput, UpdatePaymentInput};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RefundPaymentInput {
    pub amount_cents: Option<i32>,
    pub idempotency_key: String,
}
