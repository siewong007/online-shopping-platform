use std::{env, fmt::Write};

use anyhow::{Result, anyhow, bail};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use sqlx::PgPool;

use crate::{db, models::Order};

use super::gateway::{GatewayFuture, PaymentCheckout, PaymentGateway};

type HmacSha256 = Hmac<Sha256>;

const PROVIDER_ORDER_PREFIX: &str = "EKW-";

#[derive(Clone)]
pub struct SenangPayConfig {
    merchant_id: String,
    secret_key: String,
    sandbox: bool,
}

impl SenangPayConfig {
    /// No credentials means no payment collection. Sandbox is the safe default whenever the
    /// gateway is configured but a live mode has not been explicitly selected.
    pub fn from_environment() -> Result<Option<Self>> {
        let merchant_id = env::var("SENANGPAY_MERCHANT_ID")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let secret_key = env::var("SENANGPAY_SECRET_KEY")
            .ok()
            .filter(|value| !value.trim().is_empty());

        let (Some(merchant_id), Some(secret_key)) = (merchant_id, secret_key) else {
            return Ok(None);
        };

        let sandbox = match env::var("SENANGPAY_MODE")
            .unwrap_or_else(|_| "sandbox".to_string())
            .trim()
            .to_ascii_lowercase()
            .as_str()
        {
            "sandbox" => true,
            "live" => false,
            _ => bail!("SENANGPAY_MODE must be `sandbox` or `live`."),
        };

        Ok(Some(Self {
            merchant_id: merchant_id.trim().to_string(),
            secret_key: secret_key.trim().to_string(),
            sandbox,
        }))
    }

    #[cfg(test)]
    fn test_config() -> Self {
        Self {
            merchant_id: "12345".to_string(),
            secret_key: "test-secret".to_string(),
            sandbox: true,
        }
    }

    fn payment_endpoint(&self) -> String {
        let base = if self.sandbox {
            "https://sandbox.senangpay.my/payment"
        } else {
            "https://app.senangpay.my/payment"
        };
        format!("{base}/{}", self.merchant_id)
    }

    fn sign(&self, value: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes())
            .expect("HMAC accepts keys of every size");
        mac.update(value.as_bytes());
        let bytes = mac.finalize().into_bytes();
        let mut output = String::with_capacity(bytes.len() * 2);
        for byte in bytes {
            let _ = write!(output, "{byte:02x}");
        }
        output
    }

    /// Length-prefixed ("netstring") encoding. The callback fields are concatenated before
    /// signing, and free-text fields would otherwise let a holder of one legitimately signed
    /// tuple re-cut the boundaries so the same signature verifies while `order_id` names a
    /// different payment. With self-describing lengths, shifting even one character between
    /// adjacent fields changes the signed bytes.
    fn canonical_part(value: &str) -> String {
        format!("{}:{}", value.len(), value)
    }

    fn signed_payload(parts: &[&str]) -> String {
        parts
            .iter()
            .map(|part| Self::canonical_part(part))
            .collect::<Vec<_>>()
            .concat()
    }

    fn verify_callback(&self, callback: &SenangPayCallback) -> Result<()> {
        let received = decode_hex(callback.hash.trim())?;
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes())
            .expect("HMAC accepts keys of every size");
        mac.update(
            Self::signed_payload(&[
                callback.status_id.trim(),
                callback.order_id.trim(),
                callback.transaction_id.trim(),
                callback.message.trim(),
            ])
            .as_bytes(),
        );
        mac.verify_slice(&received)
            .map_err(|_| anyhow!("Invalid senangPay callback signature."))
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SenangPayCallback {
    pub status_id: String,
    pub order_id: String,
    #[serde(default)]
    pub transaction_id: String,
    #[serde(default, rename = "msg")]
    pub message: String,
    pub hash: String,
}

pub async fn start_checkout(
    pool: &PgPool,
    config: &SenangPayConfig,
    order: Order,
) -> Result<PaymentCheckout> {
    let provider_order_id = provider_order_id(order.id)?;
    let amount_cents = order.total_cents;
    if amount_cents <= 0 {
        bail!("The checkout total must be greater than zero.");
    }

    db::begin_gateway_payment(
        pool,
        "senangpay",
        order.id,
        &provider_order_id,
        amount_cents,
    )
    .await?;
    let payment_url = build_payment_url(config, &order, &provider_order_id)?;

    Ok(PaymentCheckout {
        order,
        payment_url,
        provider: "senangpay".to_string(),
    })
}

pub async fn process_callback(
    pool: &PgPool,
    config: &SenangPayConfig,
    callback: &SenangPayCallback,
) -> Result<Option<i32>> {
    config.verify_callback(callback)?;
    let provider_order_id = callback.order_id.trim();
    let _ = parse_provider_order_id(provider_order_id)?;

    let status = match callback.status_id.trim() {
        "1" => db::GatewayPaymentStatus::Captured,
        "0" => db::GatewayPaymentStatus::Failed,
        "2" => db::GatewayPaymentStatus::Pending,
        _ => bail!("Unknown senangPay payment status."),
    };
    let transaction_id = callback.transaction_id.trim();
    validate_transaction_fields(status, transaction_id, callback.message.trim())?;

    db::apply_gateway_payment_event(
        pool,
        "senangpay",
        provider_order_id,
        status,
        transaction_id,
        callback.message.trim(),
    )
    .await
}

/// Bounds the free-form callback fields before they reach the payments row: the transaction
/// identifier must look like a gateway reference (and be present when money actually moved),
/// and the stored message stays a short note rather than unbounded attacker-supplied text.
fn validate_transaction_fields(
    status: db::GatewayPaymentStatus,
    transaction_id: &str,
    message: &str,
) -> Result<()> {
    if transaction_id.len() > 64
        || !transaction_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
    {
        bail!("Invalid senangPay transaction identifier.");
    }
    if status == db::GatewayPaymentStatus::Captured && transaction_id.is_empty() {
        bail!("A senangPay transaction identifier is required to confirm capture.");
    }
    if message.len() > 256 {
        bail!("senangPay callback message is too long.");
    }
    Ok(())
}

impl PaymentGateway for SenangPayConfig {
    fn provider(&self) -> &'static str {
        "senangpay"
    }

    fn start_checkout<'a>(
        &'a self,
        pool: &'a PgPool,
        order: Order,
    ) -> GatewayFuture<'a, PaymentCheckout> {
        Box::pin(async move { start_checkout(pool, self, order).await })
    }
}

fn provider_order_id(order_id: i32) -> Result<String> {
    if order_id <= 0 {
        bail!("A valid order is required for payment.");
    }
    Ok(format!("{PROVIDER_ORDER_PREFIX}{order_id}"))
}

fn parse_provider_order_id(value: &str) -> Result<i32> {
    let Some(order_id) = value.strip_prefix(PROVIDER_ORDER_PREFIX) else {
        bail!("Unknown senangPay order reference.");
    };
    let order_id = order_id
        .parse::<i32>()
        .map_err(|_| anyhow!("Unknown senangPay order reference."))?;
    if order_id <= 0 || provider_order_id(order_id)? != value {
        bail!("Unknown senangPay order reference.");
    }
    Ok(order_id)
}

fn build_payment_url(
    config: &SenangPayConfig,
    order: &Order,
    provider_order_id: &str,
) -> Result<String> {
    let detail = format!("Ekoway_Order_{provider_order_id}");
    let amount = format!("{}.{:02}", order.total_cents / 100, order.total_cents % 100);
    let hash = config.sign(&SenangPayConfig::signed_payload(&[
        detail.as_str(),
        amount.as_str(),
        provider_order_id,
    ]));

    let params = [
        ("detail", detail),
        ("amount", amount),
        ("order_id", provider_order_id.to_string()),
        ("hash", hash),
        ("name", order.customer_name.trim().to_string()),
        ("email", order.customer_email.trim().to_string()),
        ("phone", order.customer_phone.trim().to_string()),
    ];
    let query = params
        .iter()
        .map(|(key, value)| format!("{key}={}", form_encode(value)))
        .collect::<Vec<_>>()
        .join("&");

    Ok(format!("{}?{query}", config.payment_endpoint()))
}

fn form_encode(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(char::from(byte));
            }
            b' ' => encoded.push('+'),
            _ => {
                let _ = write!(encoded, "%{byte:02X}");
            }
        }
    }
    encoded
}

fn decode_hex(input: &str) -> Result<Vec<u8>> {
    if input.len() != 64 || !input.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        bail!("Invalid senangPay callback signature.");
    }
    (0..input.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&input[index..index + 2], 16))
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|_| anyhow!("Invalid senangPay callback signature."))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::GatewayPaymentStatus;

    fn test_order() -> Order {
        Order {
            id: 42,
            customer_name: "Aminah Binti Ali".to_string(),
            customer_email: "aminah@example.com".to_string(),
            customer_phone: "012 345 6789".to_string(),
            subtotal_cents: 12345,
            discount_cents: 0,
            tax_cents: 0,
            shipping_cents: 0,
            total_cents: 12345,
            fulfillment_status: "received".to_string(),
            fulfillment_method: "pickup".to_string(),
            created_at: String::new(),
            items: Vec::new(),
            fulfillment_history: Vec::new(),
            applied_offers: Vec::new(),
        }
    }

    #[test]
    fn payment_url_uses_sandbox_and_signed_exact_amount() {
        let config = SenangPayConfig::test_config();
        let order = test_order();
        let url = build_payment_url(&config, &order, "EKW-42").expect("URL should build");

        assert!(url.starts_with("https://sandbox.senangpay.my/payment/12345?"));
        assert!(url.contains("detail=Ekoway_Order_EKW-42"));
        assert!(url.contains("amount=123.45"));
        assert!(url.contains("order_id=EKW-42"));
        assert!(url.contains("name=Aminah+Binti+Ali"));
    }

    #[test]
    fn callback_signature_must_match() {
        let config = SenangPayConfig::test_config();
        // netstrings: "1" -> 1:1, "EKW-42" -> 6:EKW-42, "1234" -> 4:1234,
        // "Payment_was_successful" -> 22:Payment_was_successful
        let signed = "1:16:EKW-424:123422:Payment_was_successful";
        let callback = SenangPayCallback {
            status_id: "1".to_string(),
            order_id: "EKW-42".to_string(),
            transaction_id: "1234".to_string(),
            message: "Payment_was_successful".to_string(),
            hash: config.sign(signed),
        };

        assert!(config.verify_callback(&callback).is_ok());
        assert!(parse_provider_order_id(&callback.order_id).is_ok());

        let mut altered = callback;
        altered.message = "Payment_failed".to_string();
        assert!(config.verify_callback(&altered).is_err());
    }

    /// Regression test for the boundary-recut forgery: under the old separator-free
    /// concatenation this forged tuple produced byte-identical signed input for order EKW-4
    /// from a receipt legitimately issued for order EKW-42. Netstring lengths break the shift.
    #[test]
    fn recut_boundary_shift_fails_signature() {
        let config = SenangPayConfig::test_config();
        // Legitimate receipt the attacker holds for their own order.
        let legit = SenangPayCallback {
            status_id: "1".to_string(),
            order_id: "EKW-42".to_string(),
            transaction_id: "1234".to_string(),
            message: "Payment_was_successful".to_string(),
            hash: String::new(),
        };
        let legit_hash = config.sign(&SenangPayConfig::signed_payload(&[
            legit.status_id.trim(),
            legit.order_id.trim(),
            legit.transaction_id.trim(),
            legit.message.trim(),
        ]));

        // Same bytes re-cut so order_id names the victim's unpaid order EKW-4.
        let forged = SenangPayCallback {
            status_id: "1".to_string(),
            order_id: "EKW-4".to_string(),
            transaction_id: "21234".to_string(),
            message: "Payment_was_successful".to_string(),
            hash: legit_hash,
        };
        assert!(config.verify_callback(&forged).is_err());
        assert!(parse_provider_order_id("EKW-4").is_ok());
    }

    #[test]
    fn captured_events_require_a_wellformed_transaction_id() {
        let cases = [
            (GatewayPaymentStatus::Captured, "", false),
            (GatewayPaymentStatus::Captured, "txn_123.45", true),
            (GatewayPaymentStatus::Pending, "", true),
            (GatewayPaymentStatus::Failed, "", true),
            (GatewayPaymentStatus::Captured, "bad id with spaces", false),
        ];
        for (status, transaction_id, ok) in cases {
            assert_eq!(
                validate_transaction_fields(status, transaction_id, "note").is_ok(),
                ok,
                "transaction_id={transaction_id:?}"
            );
        }
        assert!(
            validate_transaction_fields(GatewayPaymentStatus::Captured, "txn", &"x".repeat(257))
                .is_err()
        );
    }
}
