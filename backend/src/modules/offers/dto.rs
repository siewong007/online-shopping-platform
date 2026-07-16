use serde::Deserialize;

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePromotionInput {
    pub label: String,
    pub title: String,
    pub description: String,
    pub discount_type: Option<String>,
    pub discount_value: Option<i32>,
    #[serde(default)]
    pub minimum_subtotal_cents: i32,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
    #[serde(default)]
    pub is_stackable: bool,
    pub max_redemptions: Option<i32>,
    pub sort_order: Option<i32>,
}

pub type UpdatePromotionInput = CreatePromotionInput;

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVoucherInput {
    pub code: String,
    pub title: String,
    pub description: String,
    pub discount_type: String,
    pub discount_value: i32,
    #[serde(default)]
    pub minimum_subtotal_cents: i32,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
    #[serde(default)]
    pub is_stackable: bool,
    pub max_redemptions: Option<i32>,
    #[serde(default)]
    pub is_public: bool,
}

pub type UpdateVoucherInput = CreateVoucherInput;
