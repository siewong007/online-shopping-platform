use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Category {
    pub slug: String,
    pub name: String,
    pub teaser: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub category_slug: String,
    pub price_cents: i32,
    pub badge: String,
    pub description: String,
    pub tone: String,
    pub featured: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCategoryInput {
    pub slug: String,
    pub name: String,
    pub teaser: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductInput {
    pub name: String,
    pub category_slug: String,
    pub price_cents: i32,
    pub badge: String,
    pub description: String,
    pub tone: String,
    pub featured: bool,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Promotion {
    pub label: String,
    pub title: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ServiceItem {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ProStat {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StorefrontPayload {
    pub categories: Vec<Category>,
    pub products: Vec<Product>,
    pub promotions: Vec<Promotion>,
    pub services: Vec<ServiceItem>,
    pub pro_stats: Vec<ProStat>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AdminMetric {
    pub label: String,
    pub value: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct InventoryItem {
    pub department: String,
    pub on_hand: String,
    pub lead_region: String,
    pub status: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct FulfillmentItem {
    pub stage: String,
    pub title: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CampaignOption {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ActivityItem {
    pub happened_at: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminDashboardPayload {
    pub metrics: Vec<AdminMetric>,
    pub inventory: Vec<InventoryItem>,
    pub fulfillment: Vec<FulfillmentItem>,
    pub campaigns: Vec<CampaignOption>,
    pub activity: Vec<ActivityItem>,
}
