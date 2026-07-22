use crate::models::{CreateOrderItemInput, ShippingAddressInput, ShippingOption};
use anyhow::{Result, anyhow, bail};
use sqlx::PgConnection;

#[derive(Debug, Clone)]
pub(crate) struct DeliveryQuote {
    pub options: Vec<ShippingOption>,
    pub selected: Option<ShippingOption>,
}

#[derive(Debug, Clone)]
pub(crate) struct NormalizedShippingAddress {
    pub recipient_name: String,
    pub phone: String,
    pub address_line1: String,
    pub address_line2: String,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub country_code: String,
}

pub(crate) fn normalize_shipping_address(
    input: &ShippingAddressInput,
) -> Result<NormalizedShippingAddress> {
    let recipient_name = input.recipient_name.trim();
    let phone = input.phone.trim();
    let address_line1 = input.address_line1.trim();
    let city = input.city.trim();
    let state = input.state.trim();
    let postal_code = input.postal_code.trim();
    let country_code = input.country_code.trim().to_uppercase();

    if recipient_name.is_empty()
        || phone.is_empty()
        || address_line1.is_empty()
        || city.is_empty()
        || state.is_empty()
        || postal_code.is_empty()
    {
        bail!("A recipient, phone number, and complete delivery address are required.");
    }
    if country_code != "US" {
        bail!("Delivery is currently available only in the United States.");
    }

    Ok(NormalizedShippingAddress {
        recipient_name: recipient_name.to_string(),
        phone: phone.to_string(),
        address_line1: address_line1.to_string(),
        address_line2: input.address_line2.trim().to_string(),
        city: city.to_string(),
        state: state.to_string(),
        postal_code: postal_code.to_string(),
        country_code,
    })
}

pub(crate) async fn quote_delivery(
    conn: &mut PgConnection,
    items: &[CreateOrderItemInput],
    selected_service_code: Option<&str>,
) -> Result<DeliveryQuote> {
    let product_ids = items.iter().map(|item| item.product_id).collect::<Vec<_>>();
    let quantities = items.iter().map(|item| item.quantity).collect::<Vec<_>>();

    let options = sqlx::query_as::<_, ShippingOption>(
        r#"
        WITH requested_items AS (
            SELECT *
            FROM unnest($1::int[], $2::int[]) AS requested(product_id, quantity)
        )
        SELECT
            shipping_services.code,
            shipping_services.name,
            shipping_services.carrier,
            SUM(
                COALESCE(base_setting.value::int, shipping_service_rates.base_cents)
                + COALESCE(per_item_setting.value::int, shipping_service_rates.per_item_cents)
                    * requested_items.quantity
            )::int AS shipping_cents,
            shipping_services.min_delivery_days,
            shipping_services.max_delivery_days
        FROM requested_items
        JOIN products ON products.id = requested_items.product_id
        JOIN shipping_service_rates
            ON shipping_service_rates.shipping_class = products.shipping_class
        JOIN shipping_services
            ON shipping_services.id = shipping_service_rates.service_id
        LEFT JOIN system_settings enabled_setting
            ON enabled_setting.key = 'shipping.' || shipping_services.code || '.enabled'
        LEFT JOIN system_settings base_setting
            ON base_setting.key = 'shipping.' || shipping_services.code || '.'
                || shipping_service_rates.shipping_class || '.base_cents'
        LEFT JOIN system_settings per_item_setting
            ON per_item_setting.key = 'shipping.' || shipping_services.code || '.'
                || shipping_service_rates.shipping_class || '.per_item_cents'
        WHERE COALESCE(enabled_setting.value::boolean, shipping_services.is_active)
        GROUP BY
            shipping_services.id,
            shipping_services.code,
            shipping_services.name,
            shipping_services.carrier,
            shipping_services.min_delivery_days,
            shipping_services.max_delivery_days,
            shipping_services.sort_order
        HAVING COUNT(*) = (SELECT COUNT(*) FROM requested_items)
        ORDER BY shipping_services.sort_order, shipping_services.id
        "#,
    )
    .bind(product_ids)
    .bind(quantities)
    .fetch_all(&mut *conn)
    .await?;

    if options.is_empty() {
        bail!("No delivery service is available for this cart.");
    }

    let selected = match selected_service_code
        .map(str::trim)
        .filter(|code| !code.is_empty())
    {
        Some(code) => Some(
            options
                .iter()
                .find(|option| option.code == code)
                .cloned()
                .ok_or_else(|| {
                    anyhow!("Selected delivery service is not available for this cart.")
                })?,
        ),
        None => None,
    };

    Ok(DeliveryQuote { options, selected })
}

pub(crate) async fn insert_delivery_details(
    conn: &mut PgConnection,
    order_id: i32,
    address: &NormalizedShippingAddress,
    option: &ShippingOption,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO order_shipping_addresses
            (order_id, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(order_id)
    .bind(&address.recipient_name)
    .bind(&address.phone)
    .bind(&address.address_line1)
    .bind(&address.address_line2)
    .bind(&address.city)
    .bind(&address.state)
    .bind(&address.postal_code)
    .bind(&address.country_code)
    .execute(&mut *conn)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO shipments
            (order_id, shipping_service_code, shipping_service_name, carrier, shipping_cents)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(order_id)
    .bind(&option.code)
    .bind(&option.name)
    .bind(&option.carrier)
    .bind(option.shipping_cents)
    .execute(&mut *conn)
    .await?;

    Ok(())
}
