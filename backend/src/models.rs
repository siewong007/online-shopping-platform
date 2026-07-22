use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize)]
pub struct Paged<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminListQuery {
    pub limit: Option<i64>,
    pub before: Option<i32>,
}

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
    pub stock_quantity: i32,
    pub low_stock_threshold: i32,
    pub image_url: String,
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
    pub stock_quantity: i32,
    pub low_stock_threshold: i32,
    pub image_url: Option<String>,
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

#[derive(Debug, Clone, Deserialize)]
pub struct StorefrontQuery {
    pub q: Option<String>,
    pub category: Option<String>,
    pub min_price_cents: Option<i32>,
    pub max_price_cents: Option<i32>,
    pub sort: Option<String>,
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

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct LiveDashboardMetrics {
    pub revenue_today_cents: i64,
    pub revenue_yesterday_cents: i64,
    pub orders_awaiting_fulfillment: i64,
    pub low_stock_sku_count: i64,
    pub unpaid_invoice_count: i64,
    pub unpaid_invoice_amount_cents: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminDashboardPayload {
    pub metrics: Vec<AdminMetric>,
    pub live_metrics: LiveDashboardMetrics,
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
    #[serde(default)]
    pub promotion_id: Option<i32>,
    #[serde(default)]
    pub voucher_code: Option<String>,
    #[serde(default)]
    pub shipping_address: Option<ShippingAddressInput>,
    #[serde(default)]
    pub shipping_service_code: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CheckoutQuoteInput {
    pub items: Vec<CreateOrderItemInput>,
    #[serde(default)]
    pub fulfillment_method: Option<String>,
    #[serde(default)]
    pub promotion_id: Option<i32>,
    #[serde(default)]
    pub voucher_code: Option<String>,
    #[serde(default)]
    pub shipping_address: Option<ShippingAddressInput>,
    #[serde(default)]
    pub shipping_service_code: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ShippingAddressInput {
    pub recipient_name: String,
    pub phone: String,
    pub address_line1: String,
    #[serde(default)]
    pub address_line2: String,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ShippingOption {
    pub code: String,
    pub name: String,
    pub carrier: String,
    pub shipping_cents: i32,
    pub min_delivery_days: i32,
    pub max_delivery_days: i32,
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
pub struct AppliedOffer {
    pub promotion_id: Option<i32>,
    pub voucher_id: Option<i32>,
    pub discount_cents: i32,
    pub label: String,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CheckoutQuote {
    pub items: Vec<OrderItem>,
    pub subtotal_cents: i32,
    pub discount_cents: i32,
    pub tax_cents: i32,
    pub shipping_cents: i32,
    pub total_cents: i32,
    pub applied_offers: Vec<AppliedOffer>,
    pub shipping_options: Vec<ShippingOption>,
    pub requires_shipping_selection: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Order {
    pub id: i32,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal_cents: i32,
    pub discount_cents: i32,
    pub tax_cents: i32,
    pub shipping_cents: i32,
    pub total_cents: i32,
    pub fulfillment_status: String,
    pub fulfillment_method: String,
    pub created_at: String,
    pub items: Vec<OrderItem>,
    pub fulfillment_history: Vec<OrderFulfillmentHistory>,
    pub applied_offers: Vec<AppliedOffer>,
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
pub struct CustomerLookupQuery {
    pub email: String,
    /// Required to prove the caller owns this email: an order ID that belongs to it.
    /// Without this, the endpoint would let anyone harvest a customer's order history and
    /// spend just by guessing their email address.
    pub order_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CustomerLookupProfile {
    pub customer_name: String,
    pub customer_email: String,
    pub membership_tier: String,
    pub points_balance: i32,
    pub lifetime_purchase_cents: i32,
    pub total_orders: i32,
    pub last_purchase_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerLookupOrderItem {
    pub product_name: String,
    pub unit_price_cents: i32,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerLookupOrder {
    pub id: i32,
    pub subtotal_cents: i32,
    pub fulfillment_status: String,
    pub created_at: String,
    pub items: Vec<CustomerLookupOrderItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerLookupPayload {
    pub profile: Option<CustomerLookupProfile>,
    pub orders: Vec<CustomerLookupOrder>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CustomerAccount {
    pub id: i32,
    pub email: String,
    pub display_name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct CustomerAccountCredentials {
    pub id: i32,
    pub email: String,
    pub password_hash: String,
    pub display_name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CustomerIdentity {
    pub session_id: i32,
    pub customer_account_id: i32,
    pub email: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CustomerRegisterInput {
    pub email: String,
    pub password: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CustomerLoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerAuthPayload {
    pub token: String,
    pub account: CustomerAccount,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerMePayload {
    pub account: CustomerAccount,
    pub profile: Option<CustomerLookupProfile>,
    pub orders: Vec<CustomerLookupOrder>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CustomerSession {
    pub id: i32,
    pub user_agent: Option<String>,
    pub created_at: String,
    pub last_seen_at: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerSessionView {
    pub id: i32,
    pub user_agent: Option<String>,
    pub created_at: String,
    pub last_seen_at: String,
    pub expires_at: String,
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MembershipTier {
    pub name: String,
    pub rank: i32,
    pub min_lifetime_purchase_cents: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct NextMembershipTier {
    pub name: String,
    pub min_lifetime_purchase_cents: i32,
    pub remaining_cents: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipPayload {
    pub profile: CustomerLookupProfile,
    pub current_tier: Option<MembershipTier>,
    pub next_tier: Option<NextMembershipTier>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipBenefit {
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipTierWithBenefits {
    pub name: String,
    pub rank: i32,
    pub min_lifetime_purchase_cents: i32,
    pub benefits: Vec<MembershipBenefit>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipBenefitsPayload {
    pub current_tier: Option<String>,
    pub tiers: Vec<MembershipTierWithBenefits>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CustomerTransactionsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerTransactionItem {
    pub product_name: String,
    pub quantity: i32,
    pub unit_price_cents: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerTransactionPayment {
    pub method: String,
    pub status: String,
    pub amount_cents: i32,
    pub reference: String,
    pub processed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerTransaction {
    pub id: i32,
    pub created_at: String,
    pub status: String,
    pub subtotal_cents: i32,
    pub total_cents: i32,
    pub fulfillment_method: String,
    pub items: Vec<CustomerTransactionItem>,
    pub payments: Vec<CustomerTransactionPayment>,
    pub fulfillment_history: Vec<OrderFulfillmentHistory>,
    pub applied_offers: Vec<AppliedOffer>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerTransactionsPayload {
    pub total: i64,
    pub transactions: Vec<CustomerTransaction>,
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
    pub tax_code: Option<String>,
    pub tax_rate_bps: Option<i32>,
    pub tax_cents: i32,
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
    pub buyer_tin: Option<String>,
    pub buyer_registration_number: Option<String>,
    pub buyer_sst_registration_number: Option<String>,
    pub subtotal_cents: i32,
    pub discount_cents: i32,
    pub tax_cents: i32,
    pub total_cents: i32,
    pub amount_paid_cents: i32,
    pub issued_at: String,
    pub due_at: String,
    pub voided_at: Option<String>,
    pub exported_to_autocount_at: Option<String>,
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
    pub buyer_tin: Option<String>,
    pub buyer_registration_number: Option<String>,
    pub buyer_sst_registration_number: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RecordInvoicePaymentInput {
    pub amount_cents: i32,
    pub method: String,
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AutoCountExportInput {
    pub issued_from: Option<String>,
    pub issued_to: Option<String>,
    pub include_exported: Option<bool>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AuditEvent {
    pub id: i32,
    pub actor: String,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub detail: String,
    pub happened_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditEventQuery {
    pub limit: Option<i64>,
    pub before: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductStockInput {
    pub stock_quantity: i32,
    pub low_stock_threshold: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SupplierSyncInput {
    pub supplier: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductRestockResult {
    pub product_id: i32,
    pub name: String,
    pub added: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SupportConversation {
    pub id: i32,
    pub guest_name: String,
    pub guest_email: String,
    pub customer_account_id: Option<i32>,
    pub assigned_admin_user_id: Option<i32>,
    pub assigned_admin_display_name: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_message_at: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SupportMessage {
    pub id: i32,
    pub conversation_id: i32,
    pub author_kind: String,
    pub admin_user_id: Option<i32>,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct SupportIdentity {
    pub conversation_id: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SupportInboxItem {
    pub id: i32,
    pub guest_name: String,
    pub guest_email: String,
    pub customer_account_id: Option<i32>,
    pub assigned_admin_user_id: Option<i32>,
    pub assigned_admin_display_name: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_message_at: String,
    pub last_message_preview: String,
    pub last_message_author_kind: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupportConversationInput {
    pub guest_name: String,
    pub guest_email: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupportMessageInput {
    pub body: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupportConversationInput {
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SupportMessagesQuery {
    pub after_id: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSupportInboxQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub before: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAdminSupportConversationInput {
    pub status: Option<String>,
    pub assigned_admin_user_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateSupportConversationPayload {
    pub token: String,
    pub conversation: SupportConversation,
    pub messages: Vec<SupportMessage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupportMessagesPayload {
    pub messages: Vec<SupportMessage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminSupportThreadPayload {
    pub conversation: SupportConversation,
    pub messages: Vec<SupportMessage>,
}
