use sqlx::PgPool;

use crate::{
    emailer::Emailer,
    modules::{mfa::service::MfaConfig, payments::activation::PaymentActivationMode},
};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub payment_activation_mode: PaymentActivationMode,
    pub emailer: Emailer,
    pub mfa: MfaConfig,
}

impl AppState {
    /// Fail-closed default. A state built without an explicitly resolved activation mode cannot
    /// start a payment, so forgetting to wire the configuration through can never open the gate.
    /// The emailer defaults to disabled for the same reason: no configuration, no sends.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            payment_activation_mode: PaymentActivationMode::Disabled,
            emailer: Emailer::disabled(),
            mfa: MfaConfig::disabled(),
        }
    }

    pub fn with_payment_activation_mode(
        pool: PgPool,
        payment_activation_mode: PaymentActivationMode,
    ) -> Self {
        Self {
            pool,
            payment_activation_mode,
            emailer: Emailer::disabled(),
            mfa: MfaConfig::disabled(),
        }
    }

    pub fn with_emailer(mut self, emailer: Emailer) -> Self {
        self.emailer = emailer;
        self
    }

    pub fn with_mfa(mut self, mfa: MfaConfig) -> Self {
        self.mfa = mfa;
        self
    }
}
