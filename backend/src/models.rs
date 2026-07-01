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

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOrderItemInput {
    pub product_id: i32,
    pub quantity: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOrderInput {
    pub customer_name: String,
    pub customer_email: String,
    pub items: Vec<CreateOrderItemInput>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderItem {
    pub product_id: i32,
    pub product_name: String,
    pub unit_price_cents: i32,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct Order {
    pub id: i32,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal_cents: i32,
    pub created_at: String,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CustomerPortalProfile {
    pub id: i32,
    pub customer_name: String,
    pub customer_email: String,
    pub membership_tier: String,
    pub points_balance: i32,
    pub lifetime_purchase_cents: i32,
    pub total_orders: i32,
    pub last_purchase_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCustomerPortalProfileInput {
    pub customer_name: String,
    pub customer_email: String,
    pub membership_tier: String,
    pub points_balance: i32,
    pub lifetime_purchase_cents: i32,
    pub total_orders: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCustomerPortalProfileInput {
    pub customer_name: String,
    pub customer_email: String,
    pub membership_tier: String,
    pub points_balance: i32,
    pub lifetime_purchase_cents: i32,
    pub total_orders: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Role {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub is_super_admin: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRoleInput {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRoleInput {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct PermissionPage {
    pub id: i32,
    pub slug: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct RolePagePermission {
    pub role_id: i32,
    pub page_id: i32,
    pub can_create: bool,
    pub can_read: bool,
    pub can_update: bool,
    pub can_delete: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRolePagePermissionInput {
    pub role_id: i32,
    pub page_id: i32,
    pub can_create: bool,
    pub can_read: bool,
    pub can_update: bool,
    pub can_delete: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PermissionsPayload {
    pub roles: Vec<Role>,
    pub pages: Vec<PermissionPage>,
    pub permissions: Vec<RolePagePermission>,
}
