use sqlx::PgPool;

use crate::modules::payments::activation::PaymentActivationMode;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub payment_activation_mode: PaymentActivationMode,
    pub autocount_sync_token: Option<String>,
}

impl AppState {
    /// Fail-closed default. A state built without an explicitly resolved activation mode cannot
    /// start a payment, so forgetting to wire the configuration through can never open the gate.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            payment_activation_mode: PaymentActivationMode::Disabled,
            autocount_sync_token: autocount_sync_token_from_env(),
        }
    }

    pub fn with_payment_activation_mode(
        pool: PgPool,
        payment_activation_mode: PaymentActivationMode,
    ) -> Self {
        Self {
            pool,
            payment_activation_mode,
            autocount_sync_token: autocount_sync_token_from_env(),
        }
    }

    pub fn with_autocount_sync_token(mut self, token: impl Into<String>) -> Self {
        let token = token.into();
        self.autocount_sync_token = if token.is_empty() { None } else { Some(token) };
        self
    }
}

fn autocount_sync_token_from_env() -> Option<String> {
    match std::env::var("AUTOCOUNT_SYNC_TOKEN") {
        Ok(value) if !value.is_empty() => Some(value),
        _ => None,
    }
}
