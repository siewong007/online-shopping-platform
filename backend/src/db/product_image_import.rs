use std::collections::BTreeMap;

use anyhow::{Result, anyhow, bail};
use sqlx::PgPool;

use crate::models::{ProductImageImportReport, ProductImageManifestRow};

use super::{catalog::validate_product_image_url, catalogue_import::parse_csv_line};

const REQUIRED_HEADERS: &[&str] = &[
    "item_code",
    "uom",
    "image_url",
    "source_owner",
    "rights_status",
    "match_confidence",
    "review_status",
];

fn accepted_rights_status(value: &str) -> bool {
    matches!(
        value,
        "owned" | "supplier-approved" | "manufacturer-approved"
    )
}

fn validate_first_party_path(value: &str) -> Result<()> {
    validate_product_image_url(value)?;
    let lower = value.to_ascii_lowercase();
    if !lower.starts_with("/product-images/") {
        bail!("image_url must use Ekoway-controlled /product-images/ storage");
    }
    if value.contains("..") || value.contains('\\') || value.contains('?') || value.contains('#') {
        bail!("image_url contains an unsafe path segment");
    }
    if ![".webp", ".png", ".jpg", ".jpeg", ".gif"]
        .iter()
        .any(|extension| lower.ends_with(extension))
    {
        bail!("image_url must end in WebP, PNG, JPEG, or GIF");
    }
    Ok(())
}

pub fn parse_product_image_manifest(
    body: &str,
) -> Result<(Vec<ProductImageManifestRow>, usize, Vec<String>)> {
    let mut lines = body.lines().filter(|line| !line.trim().is_empty());
    let header_line = lines.next().ok_or_else(|| anyhow!("The file is empty."))?;
    let headers: Vec<String> = parse_csv_line(header_line.trim_start_matches('\u{feff}'))
        .into_iter()
        .map(|header| header.trim().to_ascii_lowercase())
        .collect();
    let index_of = |name: &str| headers.iter().position(|header| header == name);
    let missing: Vec<&str> = REQUIRED_HEADERS
        .iter()
        .copied()
        .filter(|header| index_of(header).is_none())
        .collect();
    if !missing.is_empty() {
        bail!("The file is missing these columns: {}.", missing.join(", "));
    }

    let source_page_index = index_of("candidate_page_url").or_else(|| index_of("source_page_url"));
    let mut approved = Vec::new();
    let mut pending = 0usize;
    let mut problems = Vec::new();
    let mut approved_by_key: BTreeMap<(String, String), String> = BTreeMap::new();

    for (offset, line) in lines.enumerate() {
        let line_number = offset + 2;
        let fields = parse_csv_line(line);
        let get = |name: &str| {
            index_of(name)
                .and_then(|index| fields.get(index))
                .map(|value| value.trim())
                .unwrap_or_default()
        };
        let review_status = get("review_status").to_ascii_lowercase();
        if review_status != "approved" {
            pending += 1;
            continue;
        }

        let item_code = get("item_code").to_string();
        let uom = get("uom").to_string();
        let image_url = get("image_url").to_string();
        let source_owner = get("source_owner").to_string();
        let rights_status = get("rights_status").to_ascii_lowercase();
        let match_confidence = get("match_confidence").to_ascii_uppercase();
        let source_page_url = source_page_index
            .and_then(|index| fields.get(index))
            .map(|value| value.trim().to_string())
            .unwrap_or_default();

        if item_code.is_empty() || uom.is_empty() {
            problems.push(format!(
                "line {line_number}: item_code and uom are required"
            ));
            continue;
        }
        if source_owner.is_empty() {
            problems.push(format!("line {line_number}: source_owner is required"));
            continue;
        }
        if !accepted_rights_status(&rights_status) {
            problems.push(format!(
                "line {line_number}: rights_status must be owned, supplier-approved, or manufacturer-approved"
            ));
            continue;
        }
        if !matches!(match_confidence.as_str(), "A" | "B") {
            problems.push(format!(
                "line {line_number}: match_confidence must be A or B"
            ));
            continue;
        }
        if let Err(error) = validate_first_party_path(&image_url) {
            problems.push(format!("line {line_number}: {error}"));
            continue;
        }

        let key = (item_code.clone(), uom.clone());
        if let Some(previous_url) = approved_by_key.insert(key, image_url.clone()) {
            problems.push(format!(
                "line {line_number}: duplicate approved key {item_code} / {uom} (previous image {previous_url})"
            ));
            continue;
        }

        approved.push(ProductImageManifestRow {
            item_code,
            uom,
            image_url,
            source_owner,
            source_page_url,
            rights_status,
            match_confidence,
        });
    }

    Ok((approved, pending, problems))
}

pub async fn import_product_image_manifest(
    pool: &PgPool,
    body: &str,
    dry_run: bool,
    changed_by: &str,
) -> Result<ProductImageImportReport> {
    let rows_read = body
        .lines()
        .filter(|line| !line.trim().is_empty())
        .count()
        .saturating_sub(1);
    let (approved_rows, rows_pending, mut problems) = parse_product_image_manifest(body)?;
    let approved_count = approved_rows.len();
    let mut products_matched = 0usize;
    let mut products_updated = 0usize;
    let mut products_unchanged = 0usize;
    let mut tx = pool.begin().await?;

    for row in approved_rows {
        let product = sqlx::query_as::<_, (i32, String)>(
            r#"
            SELECT id, image_url
            FROM products
            WHERE source_item_code = $1 AND source_uom = $2
            FOR UPDATE
            "#,
        )
        .bind(&row.item_code)
        .bind(&row.uom)
        .fetch_optional(&mut *tx)
        .await?;

        let Some((product_id, previous_image_url)) = product else {
            problems.push(format!(
                "{} / {}: no matching imported product",
                row.item_code, row.uom
            ));
            continue;
        };
        products_matched += 1;

        if previous_image_url == row.image_url {
            products_unchanged += 1;
        } else {
            products_updated += 1;
            sqlx::query("UPDATE products SET image_url = $1 WHERE id = $2")
                .bind(&row.image_url)
                .bind(product_id)
                .execute(&mut *tx)
                .await?;
            sqlx::query(
                r#"
                INSERT INTO product_image_history (
                    product_id, previous_image_url, new_image_url, source_owner,
                    source_page_url, rights_status, match_confidence, changed_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(product_id)
            .bind(&previous_image_url)
            .bind(&row.image_url)
            .bind(&row.source_owner)
            .bind(&row.source_page_url)
            .bind(&row.rights_status)
            .bind(&row.match_confidence)
            .bind(changed_by)
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query(
            r#"
            INSERT INTO product_image_metadata (
                product_id, source_owner, source_page_url, rights_status,
                match_confidence, review_status, updated_by, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, 'approved', $6, now())
            ON CONFLICT (product_id) DO UPDATE SET
                source_owner = EXCLUDED.source_owner,
                source_page_url = EXCLUDED.source_page_url,
                rights_status = EXCLUDED.rights_status,
                match_confidence = EXCLUDED.match_confidence,
                review_status = 'approved',
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
            "#,
        )
        .bind(product_id)
        .bind(&row.source_owner)
        .bind(&row.source_page_url)
        .bind(&row.rights_status)
        .bind(&row.match_confidence)
        .bind(changed_by)
        .execute(&mut *tx)
        .await?;
    }

    if dry_run {
        tx.rollback().await?;
    } else {
        tx.commit().await?;
    }
    problems.truncate(100);

    Ok(ProductImageImportReport {
        dry_run,
        rows_read,
        rows_pending,
        approved_rows: approved_count,
        products_matched,
        products_updated,
        products_unchanged,
        problems,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_product_image_manifest;

    const HEADER: &str = "item_code,uom,image_url,source_owner,rights_status,match_confidence,review_status,candidate_page_url\n";

    #[test]
    fn pending_rows_are_ignored_without_becoming_errors() {
        let csv = format!("{HEADER}ABC,UNIT,,Bosch,pending,,pending,https://example.com/product\n");
        let (approved, pending, problems) = parse_product_image_manifest(&csv).unwrap();
        assert!(approved.is_empty());
        assert_eq!(pending, 1);
        assert!(problems.is_empty());
    }

    #[test]
    fn approved_rows_require_rights_confidence_and_first_party_path() {
        let csv = format!(
            "{HEADER}ABC,UNIT,/product-images/abc.webp,Bosch,manufacturer-approved,A,approved,https://bosch.example/abc\n"
        );
        let (approved, pending, problems) = parse_product_image_manifest(&csv).unwrap();
        assert_eq!(approved.len(), 1);
        assert_eq!(pending, 0);
        assert!(problems.is_empty());

        let external = format!(
            "{HEADER}ABC,UNIT,https://marketplace.example/abc.jpg,Unknown,owned,A,approved,\n"
        );
        let (approved, _, problems) = parse_product_image_manifest(&external).unwrap();
        assert!(approved.is_empty());
        assert_eq!(problems.len(), 1);
    }

    #[test]
    fn duplicate_approved_source_keys_are_rejected() {
        let csv = format!(
            "{HEADER}ABC,UNIT,/product-images/a.webp,Ekoway,owned,A,approved,\nABC,UNIT,/product-images/b.webp,Ekoway,owned,A,approved,\n"
        );
        let (approved, _, problems) = parse_product_image_manifest(&csv).unwrap();
        assert_eq!(approved.len(), 1);
        assert_eq!(problems.len(), 1);
    }
}
