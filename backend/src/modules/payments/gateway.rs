use std::{env, future::Future, pin::Pin};

use anyhow::{Result, bail};
use serde::Serialize;
use sqlx::PgPool;

use crate::models::Order;

use super::hitpay::HitPayConfig;
use super::senangpay::SenangPayConfig;

pub type GatewayFuture<'a, T> = Pin<Box<dyn Future<Output = Result<T>> + Send + 'a>>;

/// Provider-neutral result returned to the storefront. Provider-specific response fields must
/// remain inside adapters so the React checkout never needs to know a gateway's API shape.
#[derive(Debug, Clone, Serialize)]
pub struct PaymentCheckout {
    pub order: Order,
    pub payment_url: String,
    pub provider: String,
}

#[derive(Debug, Clone)]
pub struct GatewayRefundInput {
    pub payment_id: i32,
    pub amount_cents: Option<i32>,
    pub idempotency_key: String,
    pub requested_by: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GatewayRefundResult {
    pub payment_id: i32,
    pub provider: String,
    pub provider_refund_id: String,
    pub amount_cents: i32,
    pub currency: String,
    pub status: String,
    pub duplicate: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GatewayReconciliationResult {
    pub payment_id: i32,
    pub provider: String,
    pub status: String,
    pub changed: bool,
}

/// Boundary implemented by each hosted-checkout provider. Webhook verification intentionally
/// stays in the provider adapter because every gateway signs a different byte sequence.
pub trait PaymentGateway: Send + Sync {
    fn provider(&self) -> &'static str;
    fn start_checkout<'a>(
        &'a self,
        pool: &'a PgPool,
        order: Order,
    ) -> GatewayFuture<'a, PaymentCheckout>;

    fn reconcile<'a>(
        &'a self,
        _pool: &'a PgPool,
        _payment_id: i32,
    ) -> GatewayFuture<'a, GatewayReconciliationResult> {
        Box::pin(async { bail!("This payment provider does not support API reconciliation.") })
    }

    fn refund<'a>(
        &'a self,
        _pool: &'a PgPool,
        _input: GatewayRefundInput,
    ) -> GatewayFuture<'a, GatewayRefundResult> {
        Box::pin(async { bail!("This payment provider does not support API refunds.") })
    }
}

/// Resolves only an explicitly supported adapter. With no selector, an existing senangPay
/// configuration is inferred for backward compatibility; this preserves current infrastructure
/// while the production gateway decision is being validated.
pub fn configured_gateway() -> Result<Option<Box<dyn PaymentGateway>>> {
    let selected = env::var("PAYMENT_PRIMARY_PROVIDER")
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();

    if selected.is_empty() {
        return SenangPayConfig::from_environment()
            .map(|config| config.map(|config| Box::new(config) as Box<dyn PaymentGateway>));
    }

    match selected.as_str() {
        "senangpay" => SenangPayConfig::from_environment()?.map_or_else(
            || bail!("senangPay is selected but its credentials are missing."),
            |config| Ok(Some(Box::new(config) as Box<dyn PaymentGateway>)),
        ),
        "hitpay" => HitPayConfig::from_environment()?.map_or_else(
            || bail!("HitPay is selected but its mode-specific credentials are missing."),
            |config| Ok(Some(Box::new(config) as Box<dyn PaymentGateway>)),
        ),
        "billplz" | "toyyibpay" | "curlec" | "stripe" => bail!(
            "The {selected} adapter is not enabled. Do not select it until its sandbox integration has passed."
        ),
        _ => bail!("Unsupported payment provider `{selected}`."),
    }
}

pub fn configured_gateway_for_provider(provider: &str) -> Result<Box<dyn PaymentGateway>> {
    match provider.trim().to_ascii_lowercase().as_str() {
        "hitpay" => HitPayConfig::from_environment()?
            .map(|config| Box::new(config) as Box<dyn PaymentGateway>)
            .ok_or_else(|| anyhow::anyhow!("HitPay mode-specific credentials are missing.")),
        "senangpay" => SenangPayConfig::from_environment()?
            .map(|config| Box::new(config) as Box<dyn PaymentGateway>)
            .ok_or_else(|| anyhow::anyhow!("senangPay credentials are missing.")),
        _ => bail!("Unsupported payment provider `{}`.", provider.trim()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_checkout_serializes_without_provider_specific_fields() {
        let value = serde_json::to_value(PaymentCheckout {
            order: Order {
                id: 9,
                customer_name: "Test Customer".to_string(),
                customer_email: "test@example.com".to_string(),
                customer_phone: "0123456789".to_string(),
                subtotal_cents: 10_000,
                discount_cents: 0,
                tax_cents: 0,
                shipping_cents: 0,
                total_cents: 10_000,
                fulfillment_status: "received".to_string(),
                fulfillment_method: "pickup".to_string(),
                created_at: String::new(),
                items: Vec::new(),
                fulfillment_history: Vec::new(),
                applied_offers: Vec::new(),
            },
            payment_url: "https://gateway.example/checkout/9".to_string(),
            provider: "example".to_string(),
        })
        .unwrap();

        assert_eq!(value["provider"], "example");
        assert!(value.get("merchant_id").is_none());
        assert!(value.get("signature").is_none());
    }
}
