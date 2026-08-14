use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;
use std::collections::BTreeMap;

use crate::db::settings::fetch_setting_int;
use crate::models::{CatalogueImportReport, CatalogueImportRow};

/// Columns the AutoCount catalogue export is expected to carry.
const REQUIRED_HEADERS: &[&str] = &[
    "item_code",
    "display_name",
    "category",
    "uom",
    "stock_qty",
    "price_myr",
];

/// Minimal RFC4180 reader: the export contains quoted fields with commas and doubled
/// quotes inside product names, so splitting on ',' is not sufficient.
pub(crate) fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '"' if in_quotes && chars.peek() == Some(&'"') => {
                current.push('"');
                chars.next();
            }
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => fields.push(std::mem::take(&mut current)),
            _ => current.push(ch),
        }
    }
    fields.push(current);
    fields
}

fn slugify(value: &str) -> String {
    let mut slug = String::with_capacity(value.len());
    let mut last_dash = true;
    for ch in value.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

fn price_to_cents(raw: &str) -> Result<i32> {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    let value: f64 = cleaned
        .parse()
        .map_err(|_| anyhow!("price '{raw}' is not a number"))?;
    if value < 0.0 {
        bail!("price '{raw}' is negative");
    }
    Ok((value * 100.0).round() as i32)
}

/// Parses the uploaded CSV, rejecting the whole file if the header is wrong. Bad individual
/// rows are collected rather than aborting: a single malformed line in 7,000 should not
/// cost the operator the entire import.
pub fn parse_catalogue_csv(body: &str) -> Result<(Vec<CatalogueImportRow>, Vec<String>)> {
    let mut lines = body.lines().filter(|l| !l.trim().is_empty());
    let header_line = lines.next().ok_or_else(|| anyhow!("The file is empty."))?;
    let headers: Vec<String> = parse_csv_line(header_line.trim_start_matches('\u{feff}'))
        .into_iter()
        .map(|h| h.trim().to_lowercase())
        .collect();

    let index_of = |name: &str| headers.iter().position(|h| h == name);
    let missing: Vec<&str> = REQUIRED_HEADERS
        .iter()
        .copied()
        .filter(|h| index_of(h).is_none())
        .collect();
    if !missing.is_empty() {
        bail!("The file is missing these columns: {}.", missing.join(", "));
    }

    let (i_code, i_name, i_cat, i_uom, i_qty, i_price) = (
        index_of("item_code").unwrap(),
        index_of("display_name").unwrap(),
        index_of("category").unwrap(),
        index_of("uom").unwrap(),
        index_of("stock_qty").unwrap(),
        index_of("price_myr").unwrap(),
    );

    let mut rows = Vec::new();
    let mut problems = Vec::new();

    for (offset, line) in lines.enumerate() {
        let line_no = offset + 2; // header is line 1
        let fields = parse_csv_line(line);
        let get = |i: usize| fields.get(i).map(|s| s.trim()).unwrap_or_default();

        let item_code = get(i_code).to_string();
        let name = get(i_name).to_string();
        let category = get(i_cat).to_string();

        if item_code.is_empty() || name.is_empty() || category.is_empty() {
            problems.push(format!(
                "line {line_no}: item code, name and category are required"
            ));
            continue;
        }

        let price_cents = match price_to_cents(get(i_price)) {
            Ok(cents) => cents,
            Err(error) => {
                problems.push(format!("line {line_no}: {error}"));
                continue;
            }
        };

        let stock_quantity = get(i_qty).parse::<f64>().unwrap_or(0.0).max(0.0) as i32;

        rows.push(CatalogueImportRow {
            item_code,
            name,
            category,
            uom: get(i_uom).to_string(),
            stock_quantity,
            price_cents,
        });
    }

    Ok((rows, problems))
}

/// Upserts every row against (source_item_code, source_uom) so re-running the import
/// refreshes prices and stock instead of duplicating the catalogue.
pub async fn import_catalogue(pool: &PgPool, body: &str) -> Result<CatalogueImportReport> {
    let (rows, mut problems) = parse_catalogue_csv(body)?;
    if rows.is_empty() {
        bail!("No usable rows found in the file.");
    }

    let low_stock_threshold =
        fetch_setting_int(pool, "inventory.import_low_stock_threshold", 3).await?;

    let mut tx = pool.begin().await?;

    // Categories first: products reference them by slug.
    let mut categories: BTreeMap<String, String> = BTreeMap::new();
    for row in &rows {
        categories.insert(slugify(&row.category), row.category.clone());
    }

    let existing_max: i32 =
        sqlx::query_scalar::<_, Option<i32>>("SELECT MAX(sort_order) FROM categories")
            .fetch_one(&mut *tx)
            .await?
            .unwrap_or(0);

    let mut categories_created = 0usize;
    for (offset, (slug, name)) in categories.iter().enumerate() {
        if slug.is_empty() {
            continue;
        }
        let inserted = sqlx::query_scalar::<_, bool>(
            r#"
            INSERT INTO categories (slug, name, teaser, sort_order)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING (xmax = 0) AS inserted
            "#,
        )
        .bind(slug)
        .bind(name)
        .bind(format!("Shop {name} at Ekoway Hardware."))
        .bind(existing_max + 1 + offset as i32)
        .fetch_one(&mut *tx)
        .await?;
        if inserted {
            categories_created += 1;
        }
    }

    let mut created = 0usize;
    let mut updated = 0usize;

    for row in &rows {
        let slug = slugify(&row.category);
        if slug.is_empty() {
            problems.push(format!("{}: category could not be resolved", row.item_code));
            continue;
        }

        let inserted = sqlx::query_scalar::<_, bool>(
            r#"
            INSERT INTO products (
                name, category_slug, price_cents, badge, description, tone,
                featured, sort_order, stock_quantity, low_stock_threshold,
                source_item_code, source_uom, imported_at
            )
            -- featured=TRUE on insert because the storefront query filters on it, so an
            -- imported product would otherwise be invisible. It is deliberately NOT in the
            -- update list: once staff hide a product, a re-import must not republish it.
            VALUES ($1, $2, $3, '', '', 'neutral', TRUE, 0, $4, $5, $6, $7, now())
            ON CONFLICT (source_item_code, source_uom)
                WHERE source_item_code <> ''
            DO UPDATE SET
                name = EXCLUDED.name,
                category_slug = EXCLUDED.category_slug,
                price_cents = EXCLUDED.price_cents,
                stock_quantity = EXCLUDED.stock_quantity,
                imported_at = now()
            RETURNING (xmax = 0) AS inserted
            "#,
        )
        .bind(&row.name)
        .bind(&slug)
        .bind(row.price_cents)
        .bind(row.stock_quantity)
        .bind(low_stock_threshold)
        .bind(&row.item_code)
        .bind(&row.uom)
        .fetch_one(&mut *tx)
        .await?;

        if inserted {
            created += 1;
        } else {
            updated += 1;
        }
    }

    tx.commit().await?;

    problems.truncate(50); // enough to diagnose, not enough to flood the console
    Ok(CatalogueImportReport {
        rows_read: rows.len(),
        products_created: created,
        products_updated: updated,
        categories_created,
        problems,
    })
}
