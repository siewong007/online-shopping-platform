use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Promotion {
    pub id: i32,
    pub label: String,
    pub title: String,
    pub description: String,
    pub sort_order: i32,
    pub discount_type: Option<String>,
    pub discount_value: Option<i32>,
    pub minimum_subtotal_cents: i32,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub is_active: bool,
    pub is_stackable: bool,
    pub max_redemptions: Option<i32>,
    pub redemption_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Voucher {
    pub id: i32,
    pub code: String,
    pub title: String,
    pub description: String,
    pub discount_type: String,
    pub discount_value: i32,
    pub minimum_subtotal_cents: i32,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub is_active: bool,
    pub is_stackable: bool,
    pub max_redemptions: Option<i32>,
    pub redemption_count: i32,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}
