use sqlx::PgPool;

use crate::{
    emailer::Emailer,
    modules::{mfa::service::MfaConfig, payments::activation::PaymentActivationMode},
    rate_limit::RateLimiter,
    turnstile::TurnstileConfig,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub payment_activation_mode: PaymentActivationMode,
    pub emailer: Emailer,
    pub mfa: MfaConfig,
    pub trust_proxy: bool,
    pub app_is_production: bool,
    pub rate_limiter: RateLimiter,
    pub turnstile: TurnstileConfig,
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
            trust_proxy: true,
            app_is_production: false,
            rate_limiter: RateLimiter::disabled(),
            turnstile: TurnstileConfig::disabled(),
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
            trust_proxy: true,
            app_is_production: false,
            rate_limiter: RateLimiter::disabled(),
            turnstile: TurnstileConfig::disabled(),
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

    pub fn with_trust_proxy(mut self, trust_proxy: bool) -> Self {
        self.trust_proxy = trust_proxy;
        self
    }

    pub fn with_app_is_production(mut self, app_is_production: bool) -> Self {
        self.app_is_production = app_is_production;
        self
    }

    pub fn with_rate_limiter(mut self, rate_limiter: RateLimiter) -> Self {
        self.rate_limiter = rate_limiter;
        self
    }

    pub fn with_turnstile(mut self, turnstile: TurnstileConfig) -> Self {
        self.turnstile = turnstile;
        self
    }
}
