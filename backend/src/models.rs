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
pub struct UpdateCategoryInput {
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

pub type UpdateProductInput = CreateProductInput;

#[derive(Debug, Clone, Serialize)]
pub struct AdminCatalogPayload {
    pub categories: Vec<Category>,
    pub products: Vec<Product>,
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
    pub fulfillment_method: Option<String>,
    pub items: Vec<CreateOrderItemInput>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderItem {
    pub product_id: i32,
    pub product_name: String,
    pub unit_price_cents: i32,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderFulfillmentHistory {
    pub id: i32,
    pub order_id: i32,
    pub from_status: Option<String>,
    pub to_status: String,
    pub note: String,
    pub changed_by: String,
    pub happened_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Order {
    pub id: i32,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal_cents: i32,
    pub fulfillment_status: String,
    pub fulfillment_method: String,
    pub created_at: String,
    pub items: Vec<OrderItem>,
    pub fulfillment_history: Vec<OrderFulfillmentHistory>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateOrderFulfillmentInput {
    pub to_status: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Payment {
    pub id: i32,
    pub order_id: i32,
    pub order_customer_name: String,
    pub order_customer_email: String,
    pub order_subtotal_cents: i32,
    pub idempotency_key: String,
    pub amount_cents: i32,
    pub method: String,
    pub status: String,
    pub reference: String,
    pub notes: String,
    pub processed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePaymentInput {
    pub order_id: i32,
    pub idempotency_key: String,
    pub amount_cents: i32,
    pub method: String,
    pub status: String,
    pub reference: String,
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePaymentInput {
    pub amount_cents: i32,
    pub method: String,
    pub status: String,
    pub reference: String,
    pub notes: String,
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

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AdminUser {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub role_id: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct AdminUserCredentials {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub password_hash: String,
    pub role_id: i32,
    pub role_name: String,
    pub role_description: String,
    pub is_super_admin: bool,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AdminIdentity {
    pub user_id: i32,
    pub username: String,
    pub display_name: String,
    pub role_id: i32,
    pub role_name: String,
    pub is_super_admin: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminLoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminAuthPayload {
    pub token: String,
    pub user: AdminUser,
    pub role: Role,
    pub permissions: Vec<RolePagePermission>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminMePayload {
    pub user: AdminUser,
    pub role: Role,
    pub permissions: Vec<RolePagePermission>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAdminUserInput {
    pub username: String,
    pub display_name: String,
    pub password: String,
    pub role_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAdminUserProfileInput {
    pub display_name: String,
    pub role_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetAdminUserActiveInput {
    pub is_active: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminResetPasswordInput {
    pub new_password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChangeOwnPasswordInput {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SystemSetting {
    pub key: String,
    pub value: String,
    pub value_type: String,
    pub category: String,
    pub description: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSystemSettingInput {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SalesRecord {
    pub order_id: i32,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal_cents: i32,
    pub status: String,
    pub payment_status: String,
    pub channel: String,
    pub sales_rep: String,
    pub discount_cents: i32,
    pub tax_cents: i32,
    pub total_cents: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSalesDetailsInput {
    pub channel: String,
    pub sales_rep: String,
    pub discount_cents: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSalesStatusInput {
    pub status: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SalesStatusCount {
    pub status: String,
    pub count: i64,
    pub total_cents: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SalesChannelCount {
    pub channel: String,
    pub count: i64,
    pub total_cents: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SalesSummaryPayload {
    pub total_revenue_cents: i64,
    pub order_count: i64,
    pub by_status: Vec<SalesStatusCount>,
    pub by_channel: Vec<SalesChannelCount>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct InvoiceLineItem {
    pub product_id: i32,
    pub product_name: String,
    pub unit_price_cents: i32,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct InvoicePayment {
    pub id: i32,
    pub amount_cents: i32,
    pub method: String,
    pub paid_at: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Invoice {
    pub id: i32,
    pub invoice_number: String,
    pub order_id: i32,
    pub status: String,
    pub billing_name: String,
    pub billing_email: String,
    pub billing_address: String,
    pub subtotal_cents: i32,
    pub discount_cents: i32,
    pub tax_cents: i32,
    pub total_cents: i32,
    pub amount_paid_cents: i32,
    pub issued_at: String,
    pub due_at: String,
    pub voided_at: Option<String>,
    pub line_items: Vec<InvoiceLineItem>,
    pub payments: Vec<InvoicePayment>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInvoiceFromOrderInput {
    pub discount_cents: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInvoiceBillingInput {
    pub billing_address: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RecordInvoicePaymentInput {
    pub amount_cents: i32,
    pub method: String,
    pub note: String,
}
