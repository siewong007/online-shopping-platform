use sqlx::PgPool;

use crate::modules::payments::activation::PaymentActivationMode;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub payment_activation_mode: PaymentActivationMode,
}

impl AppState {
    /// Fail-closed default. A state built without an explicitly resolved activation mode cannot
    /// start a payment, so forgetting to wire the configuration through can never open the gate.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            payment_activation_mode: PaymentActivationMode::Disabled,
        }
    }

    pub fn with_payment_activation_mode(
        pool: PgPool,
        payment_activation_mode: PaymentActivationMode,
    ) -> Self {
        Self {
            pool,
            payment_activation_mode,
        }
    }
}
