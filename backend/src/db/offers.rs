use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

use crate::modules::offers::{
    dto::{CreatePromotionInput, CreateVoucherInput, UpdatePromotionInput, UpdateVoucherInput},
    model::{Promotion, Voucher},
};

const FIXED_CENTS: &str = "fixed_cents";
const PERCENT_BPS: &str = "percent_bps";

struct RuleValues {
    discount_type: Option<String>,
    discount_value: Option<i32>,
    minimum_subtotal_cents: i32,
    starts_at: Option<String>,
    ends_at: Option<String>,
    is_active: bool,
    is_stackable: bool,
    max_redemptions: Option<i32>,
}

struct PromotionValues {
    label: String,
    title: String,
    description: String,
    sort_order: Option<i32>,
    rule: RuleValues,
}

struct VoucherValues {
    code: String,
    title: String,
    description: String,
    is_public: bool,
    rule: RuleValues,
}

fn normalize_text(value: &str) -> String {
    value.trim().to_string()
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value.map(normalize_text).filter(|value| !value.is_empty())
}

fn normalize_rule(
    discount_type: Option<String>,
    discount_value: Option<i32>,
    minimum_subtotal_cents: i32,
    starts_at: Option<String>,
    ends_at: Option<String>,
    is_active: bool,
    is_stackable: bool,
    max_redemptions: Option<i32>,
) -> Result<RuleValues> {
    if let Some(discount_type) = discount_type.as_deref()
        && !matches!(discount_type, FIXED_CENTS | PERCENT_BPS)
    {
        bail!("Discount type must be fixed_cents or percent_bps.");
    }

    if discount_type.is_some() != discount_value.is_some() {
        bail!("Discount type and discount value must be supplied together.");
    }

    if let Some(discount_value) = discount_value {
        if discount_value <= 0 {
            bail!("Discount value must be greater than zero.");
        }

        if discount_type.as_deref() == Some(PERCENT_BPS) && discount_value > 10_000 {
            bail!("Percentage discounts cannot exceed 10000 basis points.");
        }
    }

    if minimum_subtotal_cents < 0 {
        bail!("Minimum cart subtotal cannot be negative.");
    }

    if max_redemptions.is_some_and(|limit| limit <= 0) {
        bail!("Maximum redemptions must be greater than zero when set.");
    }

    Ok(RuleValues {
        discount_type,
        discount_value,
        minimum_subtotal_cents,
        starts_at,
        ends_at,
        is_active,
        is_stackable,
        max_redemptions,
    })
}

fn normalize_promotion_input(input: &CreatePromotionInput) -> Result<PromotionValues> {
    let title = normalize_text(&input.title);
    if title.is_empty() {
        bail!("Promotion title cannot be blank.");
    }

    let rule = normalize_rule(
        input.discount_type.as_deref().map(normalize_text),
        input.discount_value,
        input.minimum_subtotal_cents,
        normalize_optional_text(input.starts_at.as_deref()),
        normalize_optional_text(input.ends_at.as_deref()),
        input.is_active,
        input.is_stackable,
        input.max_redemptions,
    )?;

    Ok(PromotionValues {
        label: normalize_text(&input.label),
        title,
        description: normalize_text(&input.description),
        sort_order: input.sort_order,
        rule,
    })
}

fn normalize_voucher_input(input: &CreateVoucherInput) -> Result<VoucherValues> {
    let code = normalize_text(&input.code).to_ascii_uppercase();
    if code.is_empty() {
        bail!("Voucher code cannot be blank.");
    }

    let title = normalize_text(&input.title);
    if title.is_empty() {
        bail!("Voucher title cannot be blank.");
    }

    let rule = normalize_rule(
        Some(normalize_text(&input.discount_type)),
        Some(input.discount_value),
        input.minimum_subtotal_cents,
        normalize_optional_text(input.starts_at.as_deref()),
        normalize_optional_text(input.ends_at.as_deref()),
        input.is_active,
        input.is_stackable,
        input.max_redemptions,
    )?;

    Ok(VoucherValues {
        code,
        title,
        description: normalize_text(&input.description),
        is_public: input.is_public,
        rule,
    })
}

async fn validate_active_window(
    pool: &PgPool,
    starts_at: Option<&str>,
    ends_at: Option<&str>,
    offer_kind: &str,
) -> Result<()> {
    let (Some(starts_at), Some(ends_at)) = (starts_at, ends_at) else {
        return Ok(());
    };

    let is_valid = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT $1::timestamptz <= $2::timestamptz
        "#,
    )
    .bind(starts_at)
    .bind(ends_at)
    .fetch_one(pool)
    .await?;

    if !is_valid {
        bail!("{offer_kind} starts_at must be before or equal to ends_at.");
    }

    Ok(())
}

pub async fn fetch_admin_promotions(pool: &PgPool) -> Result<Vec<Promotion>> {
    sqlx::query_as::<_, Promotion>(
        r#"
        SELECT id,
               label,
               title,
               description,
               sort_order,
               discount_type,
               discount_value,
               minimum_subtotal_cents,
               starts_at::text AS starts_at,
               ends_at::text AS ends_at,
               is_active,
               is_stackable,
               max_redemptions,
               redemption_count,
               created_at::text AS created_at,
               updated_at::text AS updated_at
        FROM promotions
        ORDER BY sort_order, id
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn create_promotion(pool: &PgPool, input: &CreatePromotionInput) -> Result<Promotion> {
    let values = normalize_promotion_input(input)?;
    validate_active_window(
        pool,
        values.rule.starts_at.as_deref(),
        values.rule.ends_at.as_deref(),
        "Promotion",
    )
    .await?;

    let sort_order = match values.sort_order {
        Some(sort_order) => sort_order,
        None => {
            sqlx::query_scalar::<_, i32>(
                r#"
                SELECT COALESCE(MAX(sort_order), 0) + 1
                FROM promotions
                "#,
            )
            .fetch_one(pool)
            .await?
        }
    };

    sqlx::query_as::<_, Promotion>(
        r#"
        INSERT INTO promotions (
            label,
            title,
            description,
            sort_order,
            discount_type,
            discount_value,
            minimum_subtotal_cents,
            starts_at,
            ends_at,
            is_active,
            is_stackable,
            max_redemptions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12)
        RETURNING id,
                  label,
                  title,
                  description,
                  sort_order,
                  discount_type,
                  discount_value,
                  minimum_subtotal_cents,
                  starts_at::text AS starts_at,
                  ends_at::text AS ends_at,
                  is_active,
                  is_stackable,
                  max_redemptions,
                  redemption_count,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(&values.label)
    .bind(&values.title)
    .bind(&values.description)
    .bind(sort_order)
    .bind(values.rule.discount_type.as_deref())
    .bind(values.rule.discount_value)
    .bind(values.rule.minimum_subtotal_cents)
    .bind(values.rule.starts_at.as_deref())
    .bind(values.rule.ends_at.as_deref())
    .bind(values.rule.is_active)
    .bind(values.rule.is_stackable)
    .bind(values.rule.max_redemptions)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_promotion(
    pool: &PgPool,
    promotion_id: i32,
    input: &UpdatePromotionInput,
) -> Result<Promotion> {
    let values = normalize_promotion_input(input)?;
    validate_active_window(
        pool,
        values.rule.starts_at.as_deref(),
        values.rule.ends_at.as_deref(),
        "Promotion",
    )
    .await?;

    sqlx::query_as::<_, Promotion>(
        r#"
        UPDATE promotions
        SET label = $1,
            title = $2,
            description = $3,
            discount_type = $4,
            discount_value = $5,
            minimum_subtotal_cents = $6,
            starts_at = $7::timestamptz,
            ends_at = $8::timestamptz,
            is_active = $9,
            is_stackable = $10,
            max_redemptions = $11,
            sort_order = COALESCE($12, sort_order),
            updated_at = now()
        WHERE id = $13
        RETURNING id,
                  label,
                  title,
                  description,
                  sort_order,
                  discount_type,
                  discount_value,
                  minimum_subtotal_cents,
                  starts_at::text AS starts_at,
                  ends_at::text AS ends_at,
                  is_active,
                  is_stackable,
                  max_redemptions,
                  redemption_count,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(&values.label)
    .bind(&values.title)
    .bind(&values.description)
    .bind(values.rule.discount_type.as_deref())
    .bind(values.rule.discount_value)
    .bind(values.rule.minimum_subtotal_cents)
    .bind(values.rule.starts_at.as_deref())
    .bind(values.rule.ends_at.as_deref())
    .bind(values.rule.is_active)
    .bind(values.rule.is_stackable)
    .bind(values.rule.max_redemptions)
    .bind(values.sort_order)
    .bind(promotion_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Promotion not found."))
}

pub async fn delete_promotion(pool: &PgPool, promotion_id: i32) -> Result<()> {
    let redemption_count = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT redemption_count
        FROM promotions
        WHERE id = $1
        "#,
    )
    .bind(promotion_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Promotion not found."))?;

    if redemption_count > 0 {
        bail!("Promotions with recorded redemptions cannot be deleted.");
    }

    let result = sqlx::query(
        r#"
        DELETE FROM promotions
        WHERE id = $1
          AND redemption_count = 0
        "#,
    )
    .bind(promotion_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Promotion cannot be deleted after a redemption.");
    }

    Ok(())
}

pub async fn fetch_admin_vouchers(pool: &PgPool) -> Result<Vec<Voucher>> {
    sqlx::query_as::<_, Voucher>(
        r#"
        SELECT id,
               code,
               title,
               description,
               discount_type,
               discount_value,
               minimum_subtotal_cents,
               starts_at::text AS starts_at,
               ends_at::text AS ends_at,
               is_active,
               is_stackable,
               max_redemptions,
               redemption_count,
               is_public,
               created_at::text AS created_at,
               updated_at::text AS updated_at
        FROM vouchers
        ORDER BY code, id
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

async fn ensure_voucher_code_available(
    pool: &PgPool,
    code: &str,
    excluding_voucher_id: Option<i32>,
) -> Result<()> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM vouchers
            WHERE lower(code) = lower($1)
              AND ($2::integer IS NULL OR id <> $2::integer)
        )
        "#,
    )
    .bind(code)
    .bind(excluding_voucher_id)
    .fetch_one(pool)
    .await?;

    if exists {
        bail!("A voucher with that code already exists.");
    }

    Ok(())
}

pub async fn create_voucher(pool: &PgPool, input: &CreateVoucherInput) -> Result<Voucher> {
    let values = normalize_voucher_input(input)?;
    validate_active_window(
        pool,
        values.rule.starts_at.as_deref(),
        values.rule.ends_at.as_deref(),
        "Voucher",
    )
    .await?;
    ensure_voucher_code_available(pool, &values.code, None).await?;

    sqlx::query_as::<_, Voucher>(
        r#"
        INSERT INTO vouchers (
            code,
            title,
            description,
            discount_type,
            discount_value,
            minimum_subtotal_cents,
            starts_at,
            ends_at,
            is_active,
            is_stackable,
            max_redemptions,
            is_public
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9, $10, $11, $12)
        RETURNING id,
                  code,
                  title,
                  description,
                  discount_type,
                  discount_value,
                  minimum_subtotal_cents,
                  starts_at::text AS starts_at,
                  ends_at::text AS ends_at,
                  is_active,
                  is_stackable,
                  max_redemptions,
                  redemption_count,
                  is_public,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(&values.code)
    .bind(&values.title)
    .bind(&values.description)
    .bind(values.rule.discount_type.as_deref())
    .bind(values.rule.discount_value)
    .bind(values.rule.minimum_subtotal_cents)
    .bind(values.rule.starts_at.as_deref())
    .bind(values.rule.ends_at.as_deref())
    .bind(values.rule.is_active)
    .bind(values.rule.is_stackable)
    .bind(values.rule.max_redemptions)
    .bind(values.is_public)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

pub async fn update_voucher(
    pool: &PgPool,
    voucher_id: i32,
    input: &UpdateVoucherInput,
) -> Result<Voucher> {
    let values = normalize_voucher_input(input)?;
    validate_active_window(
        pool,
        values.rule.starts_at.as_deref(),
        values.rule.ends_at.as_deref(),
        "Voucher",
    )
    .await?;
    ensure_voucher_code_available(pool, &values.code, Some(voucher_id)).await?;

    sqlx::query_as::<_, Voucher>(
        r#"
        UPDATE vouchers
        SET code = $1,
            title = $2,
            description = $3,
            discount_type = $4,
            discount_value = $5,
            minimum_subtotal_cents = $6,
            starts_at = $7::timestamptz,
            ends_at = $8::timestamptz,
            is_active = $9,
            is_stackable = $10,
            max_redemptions = $11,
            is_public = $12,
            updated_at = now()
        WHERE id = $13
        RETURNING id,
                  code,
                  title,
                  description,
                  discount_type,
                  discount_value,
                  minimum_subtotal_cents,
                  starts_at::text AS starts_at,
                  ends_at::text AS ends_at,
                  is_active,
                  is_stackable,
                  max_redemptions,
                  redemption_count,
                  is_public,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at
        "#,
    )
    .bind(&values.code)
    .bind(&values.title)
    .bind(&values.description)
    .bind(values.rule.discount_type.as_deref())
    .bind(values.rule.discount_value)
    .bind(values.rule.minimum_subtotal_cents)
    .bind(values.rule.starts_at.as_deref())
    .bind(values.rule.ends_at.as_deref())
    .bind(values.rule.is_active)
    .bind(values.rule.is_stackable)
    .bind(values.rule.max_redemptions)
    .bind(values.is_public)
    .bind(voucher_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Voucher not found."))
}

pub async fn delete_voucher(pool: &PgPool, voucher_id: i32) -> Result<()> {
    let redemption_count = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT redemption_count
        FROM vouchers
        WHERE id = $1
        "#,
    )
    .bind(voucher_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("Voucher not found."))?;

    if redemption_count > 0 {
        bail!("Vouchers with recorded redemptions cannot be deleted.");
    }

    let result = sqlx::query(
        r#"
        DELETE FROM vouchers
        WHERE id = $1
          AND redemption_count = 0
        "#,
    )
    .bind(voucher_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        bail!("Voucher cannot be deleted after a redemption.");
    }

    Ok(())
}
