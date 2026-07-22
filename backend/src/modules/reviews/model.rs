use serde::Serialize;
use sqlx::FromRow;

use crate::models::Product;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ProductReview {
    pub id: i32,
    pub customer_display_name: String,
    pub rating: i16,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductDetailPayload {
    pub product: Product,
    pub reviews: Vec<ProductReview>,
    pub can_review: bool,
    pub already_reviewed: bool,
}
