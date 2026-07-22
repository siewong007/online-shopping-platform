use crate::models::*;
use anyhow::{Result, bail};
use sqlx::PgPool;

async fn fetch_setting_string(pool: &PgPool, key: &str, default: &str) -> Result<String> {
    let value = sqlx::query_scalar::<_, String>(
        r#"
        SELECT value
        FROM system_settings
        WHERE key = $1
        "#,
    )
    .bind(key)
    .fetch_optional(pool)
    .await?;

    Ok(value.unwrap_or_else(|| default.to_string()))
}

pub(crate) async fn fetch_setting_int(pool: &PgPool, key: &str, default: i32) -> Result<i32> {
    let value = fetch_setting_string(pool, key, "").await?;
    Ok(value.parse::<i32>().unwrap_or(default))
}

pub(crate) fn compute_tax_and_total(
    subtotal_cents: i32,
    discount_cents: i32,
    tax_rate_bps: i32,
) -> (i32, i32) {
    let taxable = i64::from(subtotal_cents - discount_cents).max(0);
    let tax_cents_i64 = (taxable * i64::from(tax_rate_bps.max(0))) / 10_000;
    let tax_cents = tax_cents_i64.min(i64::from(i32::MAX)) as i32;
    let total_cents = (subtotal_cents - discount_cents + tax_cents).max(0);

    (tax_cents, total_cents)
}

pub async fn fetch_system_settings(pool: &PgPool) -> Result<Vec<SystemSetting>> {
    sqlx::query_as::<_, SystemSetting>(
        r#"
        SELECT key, value, value_type, category, description, updated_at::text AS updated_at
        FROM system_settings
        ORDER BY category, key
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

fn validate_setting_value(
    key: &str,
    value_type: &str,
    current_value: &str,
    value: &str,
) -> Result<()> {
    if key.starts_with("shipping.") && key.ends_with("_cents") {
        let parsed: i64 = value
            .parse()
            .map_err(|_| anyhow::anyhow!("Shipping rates must be whole cents."))?;
        if !(0..=100_000_000).contains(&parsed) {
            bail!("Shipping rates must be between 0 and 100000000 cents.");
        }
        return Ok(());
    }

    match key {
        "sales.default_tax_rate_bps" => {
            let parsed: i64 = value
                .parse()
                .map_err(|_| anyhow::anyhow!("Tax rate must be a whole number."))?;
            if !(0..=10000).contains(&parsed) {
                bail!("Tax rate must be between 0 and 10000 basis points.");
            }
        }
        "invoicing.payment_terms_days" => {
            let parsed: i64 = value
                .parse()
                .map_err(|_| anyhow::anyhow!("Payment terms must be a whole number of days."))?;
            if !(0..=365).contains(&parsed) {
                bail!("Payment terms must be between 0 and 365 days.");
            }
        }
        "invoicing.next_sequence" => {
            let parsed: i64 = value
                .parse()
                .map_err(|_| anyhow::anyhow!("Next sequence must be a whole number."))?;
            let current: i64 = current_value.parse().unwrap_or(0);
            if parsed <= current {
                bail!("Next sequence must be greater than the current value ({current}).");
            }
        }
        "general.currency_code" => {
            let is_valid = value.len() == 3 && value.bytes().all(|b| b.is_ascii_uppercase());
            if !is_valid {
                bail!("Currency code must be three uppercase letters (e.g. USD).");
            }
        }
        _ if value_type == "bool" && !matches!(value, "true" | "false") => {
            bail!("Setting {key} must be true or false.");
        }
        _ if value_type == "int" => {
            value
                .parse::<i64>()
                .map_err(|_| anyhow::anyhow!("Setting {key} must be a whole number."))?;
        }
        _ => {}
    }

    Ok(())
}

pub async fn update_system_setting(
    pool: &PgPool,
    key: &str,
    input: &UpdateSystemSettingInput,
) -> Result<SystemSetting> {
    let value = input.value.trim();
    if value.is_empty() {
        bail!("Setting value cannot be empty.");
    }

    // `FOR UPDATE` inside a transaction locks the row for the read-validate-write span, so a
    // second concurrent update (e.g. two admins bumping `invoicing.next_sequence`) blocks until
    // this one commits rather than validating against a stale `current_value`.
    let mut tx = pool.begin().await?;

    let current = sqlx::query_as::<_, SystemSetting>(
        r#"
        SELECT key, value, value_type, category, description, updated_at::text AS updated_at
        FROM system_settings
        WHERE key = $1
        FOR UPDATE
        "#,
    )
    .bind(key)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Setting {key} does not exist."))?;

    validate_setting_value(key, &current.value_type, &current.value, value)?;

    let updated = sqlx::query_as::<_, SystemSetting>(
        r#"
        UPDATE system_settings
        SET value = $1, updated_at = now()
        WHERE key = $2
        RETURNING key, value, value_type, category, description, updated_at::text AS updated_at
        "#,
    )
    .bind(value)
    .bind(key)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Setting {key} does not exist."))?;

    tx.commit().await?;

    Ok(updated)
}
