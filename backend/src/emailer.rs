use std::time::Duration;

use anyhow::{Context, Result, bail};
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
    message::{Mailbox, Message},
    transport::smtp::authentication::Credentials,
};
use sqlx::PgPool;

use crate::modules::audit;

const RETRY_BACKOFFS: [Duration; 2] = [Duration::from_secs(2), Duration::from_secs(8)];
const COMPANY_NAME: &str = "Ekoway Hardware";

/// Transactional email over the operator's SMTP relay. Disabled unless both `SMTP_HOST` and
/// `SMTP_FROM_ADDRESS` are configured, so local dev and tests never open network connections.
/// A misconfigured value stops startup (like `PAYMENT_ACTIVATION_MODE`) instead of silently
/// dropping customer emails in production.
#[derive(Clone)]
pub struct Emailer {
    enabled: bool,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    from: String,
}

impl Emailer {
    pub fn disabled() -> Self {
        Self {
            enabled: false,
            host: String::new(),
            port: 587,
            username: None,
            password: None,
            from: String::new(),
        }
    }

    pub fn from_environment() -> Result<Self> {
        let host = std::env::var("SMTP_HOST")
            .unwrap_or_default()
            .trim()
            .to_string();
        let from = std::env::var("SMTP_FROM_ADDRESS")
            .unwrap_or_default()
            .trim()
            .to_string();

        if host.is_empty() && from.is_empty() {
            return Ok(Self::disabled());
        }
        if host.is_empty() || from.is_empty() {
            bail!(
                "Transactional email requires both SMTP_HOST and SMTP_FROM_ADDRESS when either is set"
            );
        }
        parse_mailbox(&from)
            .context("SMTP_FROM_ADDRESS must look like \"Name <address>\" or \"address\"")?;

        let port = match std::env::var("SMTP_PORT") {
            Ok(raw) => raw
                .trim()
                .parse::<u16>()
                .context("SMTP_PORT must be a TCP port number")?,
            Err(_) => 587,
        };

        let username = std::env::var("SMTP_USERNAME")
            .ok()
            .map(|value| value.trim().to_string());
        let password = std::env::var("SMTP_PASSWORD").ok();
        if username.as_deref().is_some_and(str::is_empty) {
            bail!("SMTP_USERNAME must not be empty when set");
        }

        Ok(Self {
            enabled: true,
            host,
            port,
            username: username.filter(|value| !value.is_empty()),
            password,
            from,
        })
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Fire-and-forget send. The spawned task owns its retries; a permanently undeliverable
    /// message is logged and recorded as an audit event so the operator's team log shows it.
    /// It must never block or fail the business mutation that triggered it.
    pub fn spawn_send(
        &self,
        pool: PgPool,
        entity_type: &'static str,
        entity_id: String,
        to: String,
        subject: String,
        body: String,
    ) {
        if !self.enabled || to.trim().is_empty() {
            return;
        }
        let emailer = self.clone();
        tokio::spawn(async move {
            if let Err(error) = emailer.deliver_with_retries(&to, &subject, &body).await {
                tracing::warn!(
                    %error,
                    to = %to,
                    subject = %subject,
                    "transactional email was not delivered after retries"
                );
                audit::service::record_event(
                    &pool,
                    "system",
                    "email_failed",
                    entity_type,
                    &entity_id,
                    &format!("{subject}: {error:#}"),
                )
                .await;
            }
        });
    }

    pub fn spawn_order_confirmation(&self, pool: PgPool, order: &crate::models::Order) {
        let subject = format!("{} order #{} received", COMPANY_NAME, order.id);
        let body = format!(
            "Hi {},\n\nThank you for your order #{} placed on {}.\n\n{}\n\nTotal: {}\n\nWe will contact you at {} when your order is ready.\n\n{}\n",
            order.customer_name,
            order.id,
            order.created_at,
            format_order_lines(order),
            format_cents(order.total_cents),
            order.customer_phone.trim(),
            COMPANY_NAME,
        );
        self.spawn_send(
            pool,
            "order",
            order.id.to_string(),
            order.customer_email.clone(),
            subject,
            body,
        );
    }

    pub fn spawn_payment_captured(&self, pool: PgPool, order_id: i32) {
        if !self.enabled {
            return;
        }
        let emailer = self.clone();
        tokio::spawn(async move {
            let Some(contact) = fetch_order_contact(&pool, order_id).await else {
                tracing::warn!(order_id, "captured payment email skipped: order not found");
                return;
            };
            let subject = format!(
                "{} payment received for order #{}",
                COMPANY_NAME, contact.order_id
            );
            let body = format!(
                "Hi {},\n\nWe have received your payment of {} for order #{}. Thank you.\n\n{}\n",
                contact.customer_name,
                format_cents(contact.total_cents),
                contact.order_id,
                COMPANY_NAME,
            );
            emailer.spawn_send(
                pool.clone(),
                "payment",
                contact.order_id.to_string(),
                contact.customer_email,
                subject,
                body,
            );
        });
    }

    pub fn spawn_refund_notice(&self, pool: PgPool, order_id: i32, amount_cents: i32) {
        if !self.enabled {
            return;
        }
        let emailer = self.clone();
        tokio::spawn(async move {
            let Some(contact) = fetch_order_contact(&pool, order_id).await else {
                tracing::warn!(order_id, "refund email skipped: order not found");
                return;
            };
            let subject = format!(
                "{} refund processed for order #{}",
                COMPANY_NAME, contact.order_id
            );
            let body = format!(
                "Hi {},\n\nA refund of {} for order #{} has been processed. It may take a few business days to appear on your statement.\n\n{}\n",
                contact.customer_name,
                format_cents(amount_cents),
                contact.order_id,
                COMPANY_NAME,
            );
            emailer.spawn_send(
                pool.clone(),
                "refund",
                contact.order_id.to_string(),
                contact.customer_email,
                subject,
                body,
            );
        });
    }

    async fn deliver_with_retries(&self, to: &str, subject: &str, body: &str) -> Result<()> {
        let mut last_error = None;
        for backoff in [None, Some(RETRY_BACKOFFS[0]), Some(RETRY_BACKOFFS[1])] {
            match self.deliver_once(to, subject, body).await {
                Ok(()) => return Ok(()),
                Err(error) => {
                    last_error = Some(error);
                    if let Some(delay) = backoff {
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("email delivery made no attempts")))
    }

    async fn deliver_once(&self, to: &str, subject: &str, body: &str) -> Result<()> {
        let from = parse_mailbox(&self.from)?;
        let recipient = parse_mailbox(to)?;
        let message = Message::builder()
            .from(from)
            .to(recipient)
            .subject(subject)
            .body(body.to_string())
            .context("transactional email could not be encoded")?;

        let mut builder = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.host)
            .context("SMTP relay hostname is invalid")?
            .port(self.port);
        if let Some(username) = &self.username {
            builder = builder.credentials(Credentials::new(
                username.clone(),
                self.password.clone().unwrap_or_default(),
            ));
        }
        let transport = builder.build();
        transport
            .send(message)
            .await
            .map_err(|error| anyhow::anyhow!("SMTP send failed: {error}"))?;
        Ok(())
    }
}

struct OrderEmailContact {
    order_id: i32,
    customer_name: String,
    customer_email: String,
    total_cents: i32,
}

async fn fetch_order_contact(pool: &PgPool, order_id: i32) -> Option<OrderEmailContact> {
    sqlx::query_as::<_, (i32, String, String, i32)>(
        r#"
        SELECT id, customer_name, customer_email, total_cents
        FROM orders
        WHERE id = $1
        "#,
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .map(
        |(order_id, customer_name, customer_email, total_cents)| OrderEmailContact {
            order_id,
            customer_name,
            customer_email,
            total_cents,
        },
    )
}

fn parse_mailbox(value: &str) -> Result<Mailbox> {
    value
        .parse::<Mailbox>()
        .with_context(|| format!("\"{value}\" is not a valid email address"))
}

fn format_cents(cents: i32) -> String {
    format!("RM {}.{:02}", cents / 100, cents % 100)
}

fn format_order_lines(order: &crate::models::Order) -> String {
    order
        .items
        .iter()
        .map(|item| {
            format!(
                "- {} x{} ({})",
                item.product_name,
                item.quantity,
                format_cents(item.unit_price_cents * item.quantity)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// One sequential test: the three scenarios share process-global SMTP_* env vars, and
    /// sibling tests would race on them.
    #[test]
    fn configuration_gates_are_exact() {
        // Nothing configured -> disabled (dev/test default).
        unsafe {
            std::env::remove_var("SMTP_HOST");
        }
        unsafe {
            std::env::remove_var("SMTP_FROM_ADDRESS");
        }
        assert!(!Emailer::from_environment().expect("default").is_enabled());

        // Half-configured -> rejected rather than half-enabled.
        unsafe {
            std::env::set_var("SMTP_HOST", "relay.example.com");
        }
        unsafe {
            std::env::remove_var("SMTP_FROM_ADDRESS");
        }
        assert!(Emailer::from_environment().is_err());
        unsafe {
            std::env::remove_var("SMTP_HOST");
        }
        unsafe {
            std::env::set_var("SMTP_FROM_ADDRESS", "orders@ekowayhardware.com");
        }
        assert!(Emailer::from_environment().is_err());

        // Fully configured -> enabled; an unparseable From address still stops startup.
        unsafe {
            std::env::set_var("SMTP_HOST", "relay.example.com");
        }
        unsafe {
            std::env::set_var("SMTP_PORT", "2525");
        }
        unsafe {
            std::env::set_var(
                "SMTP_FROM_ADDRESS",
                "Ekoway Hardware <orders@ekowayhardware.com>",
            );
        }
        let emailer = Emailer::from_environment().expect("valid configuration");
        assert!(emailer.is_enabled());
        unsafe {
            std::env::set_var("SMTP_FROM_ADDRESS", "not-an-address");
        }
        assert!(Emailer::from_environment().is_err());
        unsafe {
            std::env::remove_var("SMTP_HOST");
        }
        unsafe {
            std::env::remove_var("SMTP_PORT");
        }
        unsafe {
            std::env::remove_var("SMTP_FROM_ADDRESS");
        }
    }

    #[test]
    fn money_and_lines_render_customer_friendly_text() {
        assert_eq!(format_cents(1234), "RM 12.34");
        assert_eq!(format_cents(5), "RM 0.05");

        let order = crate::models::Order {
            id: 7,
            customer_name: "Ali".to_string(),
            customer_email: "ali@example.com".to_string(),
            customer_phone: "012-345".to_string(),
            subtotal_cents: 300,
            discount_cents: 0,
            tax_cents: 0,
            shipping_cents: 0,
            total_cents: 300,
            fulfillment_status: "received".to_string(),
            fulfillment_method: "pickup".to_string(),
            created_at: "2026-08-22 10:00:00+00".to_string(),
            items: vec![],
            fulfillment_history: vec![],
            applied_offers: vec![],
        };
        assert_eq!(format_order_lines(&order), "");
    }
}
