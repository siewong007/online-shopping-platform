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

pub async fn update_system_setting(
    pool: &PgPool,
    key: &str,
    input: &UpdateSystemSettingInput,
) -> Result<SystemSetting> {
    let value = input.value.trim();
    if value.is_empty() {
        bail!("Setting value cannot be empty.");
    }

    sqlx::query_as::<_, SystemSetting>(
        r#"
        UPDATE system_settings
        SET value = $1, updated_at = now()
        WHERE key = $2
        RETURNING key, value, value_type, category, description, updated_at::text AS updated_at
        "#,
    )
    .bind(value)
    .bind(key)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Setting {key} does not exist."))
}
