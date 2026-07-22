use crate::models::Product;
use crate::modules::reviews::{dto::CreateReviewInput, model::ProductDetailPayload};
use anyhow::{Result, bail};
use sqlx::PgPool;

use crate::modules::reviews::model::ProductReview;

const VERIFIED_PURCHASE_STATUSES: &[&str] = &["completed", "delivered"];

async fn fetch_product(pool: &PgPool, product_id: i32) -> Result<Option<Product>> {
    let product = sqlx::query_as::<_, Product>(
        r#"
        SELECT products.id, products.name, products.category_slug, products.price_cents, products.badge,
               products.description, products.tone, products.featured, products.stock_quantity,
               products.low_stock_threshold, products.image_url,
               review_stats.avg_rating, COALESCE(review_stats.review_count, 0) AS review_count
        FROM products
        LEFT JOIN (
            SELECT product_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::bigint AS review_count
            FROM product_reviews GROUP BY product_id
        ) review_stats ON review_stats.product_id = products.id
        WHERE products.id = $1
        "#,
    )
    .bind(product_id)
    .fetch_optional(pool)
    .await?;

    Ok(product)
}

async fn fetch_reviews(pool: &PgPool, product_id: i32) -> Result<Vec<ProductReview>> {
    let reviews = sqlx::query_as::<_, ProductReview>(
        r#"
        SELECT product_reviews.id,
               customer_accounts.display_name AS customer_display_name,
               product_reviews.rating,
               product_reviews.body,
               product_reviews.created_at::text AS created_at
        FROM product_reviews
        JOIN customer_accounts ON customer_accounts.id = product_reviews.customer_account_id
        WHERE product_reviews.product_id = $1
        ORDER BY product_reviews.created_at DESC
        "#,
    )
    .bind(product_id)
    .fetch_all(pool)
    .await?;

    Ok(reviews)
}

async fn find_verified_order_id(
    pool: &PgPool,
    product_id: i32,
    customer_account_id: i32,
) -> Result<Option<i32>> {
    let order_id = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT orders.id
        FROM orders
        JOIN order_items ON order_items.order_id = orders.id
        WHERE orders.customer_account_id = $1
          AND order_items.product_id = $2
          AND orders.fulfillment_status = ANY($3)
        ORDER BY orders.created_at DESC
        LIMIT 1
        "#,
    )
    .bind(customer_account_id)
    .bind(product_id)
    .bind(VERIFIED_PURCHASE_STATUSES)
    .fetch_optional(pool)
    .await?;

    Ok(order_id)
}

async fn has_reviewed(pool: &PgPool, product_id: i32, customer_account_id: i32) -> Result<bool> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM product_reviews
            WHERE product_id = $1 AND customer_account_id = $2
        )
        "#,
    )
    .bind(product_id)
    .bind(customer_account_id)
    .fetch_one(pool)
    .await?;

    Ok(exists)
}

pub async fn fetch_product_detail(
    pool: &PgPool,
    product_id: i32,
    customer_account_id: Option<i32>,
) -> Result<Option<ProductDetailPayload>> {
    let Some(product) = fetch_product(pool, product_id).await? else {
        return Ok(None);
    };
    let reviews = fetch_reviews(pool, product_id).await?;

    let (can_review, already_reviewed) = match customer_account_id {
        Some(customer_account_id) => {
            let already_reviewed = has_reviewed(pool, product_id, customer_account_id).await?;
            let verified = find_verified_order_id(pool, product_id, customer_account_id)
                .await?
                .is_some();
            (verified && !already_reviewed, already_reviewed)
        }
        None => (false, false),
    };

    Ok(Some(ProductDetailPayload {
        product,
        reviews,
        can_review,
        already_reviewed,
    }))
}

pub async fn create_product_review(
    pool: &PgPool,
    product_id: i32,
    customer_account_id: i32,
    input: &CreateReviewInput,
) -> Result<ProductReview> {
    if !(1..=5).contains(&input.rating) {
        bail!("Rating must be between 1 and 5.");
    }
    let body = input.body.trim();
    if body.is_empty() {
        bail!("Review text is required.");
    }

    if has_reviewed(pool, product_id, customer_account_id).await? {
        bail!("You've already reviewed this product.");
    }

    let Some(order_id) = find_verified_order_id(pool, product_id, customer_account_id).await?
    else {
        bail!("Only customers who have purchased and received this product can leave a review.");
    };

    let review_id: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO product_reviews (product_id, customer_account_id, order_id, rating, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
    )
    .bind(product_id)
    .bind(customer_account_id)
    .bind(order_id)
    .bind(input.rating)
    .bind(body)
    .fetch_one(pool)
    .await?;

    let review = sqlx::query_as::<_, ProductReview>(
        r#"
        SELECT product_reviews.id,
               customer_accounts.display_name AS customer_display_name,
               product_reviews.rating,
               product_reviews.body,
               product_reviews.created_at::text AS created_at
        FROM product_reviews
        JOIN customer_accounts ON customer_accounts.id = product_reviews.customer_account_id
        WHERE product_reviews.id = $1
        "#,
    )
    .bind(review_id)
    .fetch_one(pool)
    .await?;

    Ok(review)
}
