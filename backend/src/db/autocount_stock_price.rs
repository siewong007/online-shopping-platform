use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

use super::catalogue_import::parse_csv_line;
use crate::models::AutocountStockPriceReport;

/// Price 1 + stock from a desktop AutoCount item listing. Cost columns are ignored on purpose.
#[derive(Debug, Clone)]
pub struct AutocountStockPriceRow {
    pub item_code: String,
    pub uom: String,
    pub price_cents: i32,
    pub stock_quantity: i32,
    pub is_active: Option<bool>,
}

fn normalize_header(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .replace(['.', '_', '-'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn header_index(headers: &[String], aliases: &[&str]) -> Option<usize> {
    headers.iter().position(|header| {
        aliases
            .iter()
            .any(|alias| header == &normalize_header(alias))
    })
}

fn is_cost_header(header: &str) -> bool {
    header.contains("cost")
}

fn price_to_cents(raw: &str) -> Result<i32> {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    if cleaned.is_empty() || cleaned == "-" || cleaned == "." {
        bail!("price '{raw}' is not a number");
    }
    let value: f64 = cleaned
        .parse()
        .map_err(|_| anyhow!("price '{raw}' is not a number"))?;
    if value < 0.0 {
        bail!("price '{raw}' is negative");
    }
    Ok((value * 100.0).round() as i32)
}

fn parse_qty(raw: &str) -> i32 {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    cleaned.parse::<f64>().unwrap_or(0.0).max(0.0) as i32
}

fn parse_active(raw: &str) -> Option<bool> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "" => None,
        "checked" | "true" | "yes" | "1" | "active" => Some(true),
        "unchecked" | "false" | "no" | "0" | "inactive" => Some(false),
        _ => None,
    }
}

pub fn parse_autocount_stock_price_csv(
    body: &str,
) -> Result<(Vec<AutocountStockPriceRow>, Vec<String>)> {
    let mut lines = body.lines().filter(|line| !line.trim().is_empty());
    let header_line = lines.next().ok_or_else(|| anyhow!("The file is empty."))?;
    let headers: Vec<String> = parse_csv_line(header_line.trim_start_matches('\u{feff}'))
        .into_iter()
        .map(|header| normalize_header(&header))
        .collect();

    if headers.iter().any(|header| is_cost_header(header)) {
        tracing::info!("AutoCount stock/price push ignored cost column(s)");
    }

    let i_code = header_index(&headers, &["item code", "itemcode", "item_code"])
        .ok_or_else(|| anyhow!("The file is missing an Item Code column."))?;
    let i_price = header_index(&headers, &["price 1", "price1", "price myr", "price_myr"])
        .ok_or_else(|| anyhow!("The file is missing a Price 1 column."))?;
    let i_qty = header_index(
        &headers,
        &[
            "total bal qty",
            "total bal. qty",
            "stock qty",
            "stock_qty",
            "bal qty",
        ],
    )
    .ok_or_else(|| anyhow!("The file is missing a Total Bal. Qty column."))?;
    let i_uom = header_index(&headers, &["base uom", "uom"]);
    let i_active = header_index(&headers, &["is active", "active"]);

    let mut rows = Vec::new();
    let mut problems = Vec::new();
    let mut seen = std::collections::BTreeSet::new();

    for (offset, line) in lines.enumerate() {
        let line_no = offset + 2;
        let fields = parse_csv_line(line);
        let get = |i: usize| fields.get(i).map(|s| s.trim()).unwrap_or_default();

        let item_code = get(i_code).to_string();
        if item_code.is_empty() {
            problems.push(format!("line {line_no}: item code is required"));
            continue;
        }
        if !seen.insert(item_code.clone()) {
            problems.push(format!("line {line_no}: duplicate item code {item_code}"));
            continue;
        }

        let price_cents = match price_to_cents(get(i_price)) {
            Ok(cents) => cents,
            Err(error) => {
                problems.push(format!("line {line_no}: {error}"));
                continue;
            }
        };

        rows.push(AutocountStockPriceRow {
            uom: i_uom.map(get).unwrap_or_default().to_string(),
            stock_quantity: parse_qty(get(i_qty)),
            is_active: i_active.and_then(|index| parse_active(get(index))),
            item_code,
            price_cents,
        });
    }

    Ok((rows, problems))
}

pub async fn apply_autocount_stock_price(
    pool: &PgPool,
    body: &str,
) -> Result<AutocountStockPriceReport> {
    let (rows, mut problems) = parse_autocount_stock_price_csv(body)?;
    if rows.is_empty() {
        bail!("No usable Price 1 rows found in the file.");
    }

    let codes: Vec<String> = rows.iter().map(|row| row.item_code.clone()).collect();
    let prices: Vec<i32> = rows.iter().map(|row| row.price_cents).collect();
    let quantities: Vec<i32> = rows.iter().map(|row| row.stock_quantity).collect();
    let uoms: Vec<String> = rows.iter().map(|row| row.uom.clone()).collect();
    let inactive: Vec<String> = rows
        .iter()
        .filter(|row| row.is_active == Some(false))
        .map(|row| row.item_code.clone())
        .collect();

    let mut tx = pool.begin().await?;

    let products_updated = sqlx::query_scalar::<_, i64>(
        r#"
        WITH updated AS (
            UPDATE products AS product
            SET
                price_cents = incoming.price_cents,
                stock_quantity = incoming.stock_quantity,
                imported_at = now()
            FROM unnest($1::text[], $2::int4[], $3::int4[])
                AS incoming(item_code, price_cents, stock_quantity)
            WHERE product.source_item_code = incoming.item_code
              AND (
                    product.price_cents IS DISTINCT FROM incoming.price_cents
                 OR product.stock_quantity IS DISTINCT FROM incoming.stock_quantity
              )
            RETURNING product.id
        )
        SELECT COUNT(*) FROM updated
        "#,
    )
    .bind(&codes)
    .bind(&prices)
    .bind(&quantities)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE products AS product
        SET source_uom = incoming.uom
        FROM unnest($1::text[], $2::text[]) AS incoming(item_code, uom)
        WHERE product.source_item_code = incoming.item_code
          AND incoming.uom <> ''
          AND product.source_uom IS DISTINCT FROM incoming.uom
          AND NOT EXISTS (
              SELECT 1
              FROM products AS other
              WHERE other.source_item_code = product.source_item_code
                AND other.id <> product.id
          )
        "#,
    )
    .bind(&codes)
    .bind(&uoms)
    .execute(&mut *tx)
    .await?;

    let listings_hidden = sqlx::query_scalar::<_, i64>(
        r#"
        WITH hidden AS (
            UPDATE products AS product
            SET featured = FALSE
            FROM unnest($1::text[], $2::text[]) AS incoming(item_code, uom)
            WHERE product.source_item_code = incoming.item_code
              AND incoming.uom <> ''
              AND product.source_uom IS DISTINCT FROM incoming.uom
              AND product.featured IS TRUE
              AND EXISTS (
                  SELECT 1
                  FROM products AS keep
                  WHERE keep.source_item_code = product.source_item_code
                    AND keep.source_uom = incoming.uom
              )
            RETURNING product.id
        )
        SELECT COUNT(*) FROM hidden
        "#,
    )
    .bind(&codes)
    .bind(&uoms)
    .fetch_one(&mut *tx)
    .await?;

    if !inactive.is_empty() {
        sqlx::query(
            r#"
            UPDATE products
            SET featured = FALSE
            WHERE source_item_code = ANY($1::text[])
              AND featured IS TRUE
            "#,
        )
        .bind(&inactive)
        .execute(&mut *tx)
        .await?;
    }

    let products_matched = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(DISTINCT source_item_code)
        FROM products
        WHERE source_item_code = ANY($1::text[])
        "#,
    )
    .bind(&codes)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    let unmatched = codes.len().saturating_sub(products_matched as usize);
    problems.truncate(50);
    Ok(AutocountStockPriceReport {
        rows_read: rows.len(),
        products_matched: products_matched as usize,
        products_updated: products_updated as usize,
        listings_hidden: listings_hidden as usize,
        unmatched,
        problems,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_autocount_stock_price_csv;

    #[test]
    fn reads_desktop_autocount_item_listing_headers() {
        let csv = concat!(
            "Item Code,Base UOM,Description,Reference,Price 1,Bar Code,Is Active,Total Bal. Qty,Min. Qty,Last Cost\n",
            "CABLE-1,MTR,Flex cable,O,12.90,x,Checked,10,0,9.99\n",
            "GLOVE-1,PAIR,Glove,O,15.90,y,Unchecked,-1,0,\n"
        );
        let (rows, problems) = parse_autocount_stock_price_csv(csv).expect("parse");
        assert!(problems.is_empty());
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].item_code, "CABLE-1");
        assert_eq!(rows[0].uom, "MTR");
        assert_eq!(rows[0].price_cents, 1290);
        assert_eq!(rows[0].stock_quantity, 10);
        assert_eq!(rows[0].is_active, Some(true));
        assert_eq!(rows[1].price_cents, 1590);
        assert_eq!(rows[1].stock_quantity, 0);
        assert_eq!(rows[1].is_active, Some(false));
    }

    #[test]
    fn rejects_missing_price_1() {
        let err = parse_autocount_stock_price_csv("Item Code,Total Bal. Qty\nA,1\n")
            .expect_err("need Price 1");
        assert!(err.to_string().contains("Price 1"));
    }
}
