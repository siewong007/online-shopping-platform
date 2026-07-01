export type Category = {
  slug: string;
  name: string;
  teaser: string;
};

export type Product = {
  id: number;
  name: string;
  category_slug: string;
  price_cents: number;
  badge: string;
  description: string;
  tone: string;
  featured: boolean;
};

export type CreateCategoryInput = {
  slug: string;
  name: string;
  teaser: string;
};

export type CreateProductInput = {
  name: string;
  category_slug: string;
  price_cents: number;
  badge: string;
  description: string;
  tone: string;
  featured: boolean;
};

export type Promotion = {
  label: string;
  title: string;
  description: string;
};

export type ServiceItem = {
  name: string;
  description: string;
};

export type ProStat = {
  label: string;
  value: string;
};

export type StorefrontPayload = {
  categories: Category[];
  products: Product[];
  promotions: Promotion[];
  services: ServiceItem[];
  pro_stats: ProStat[];
};

export type AdminMetric = {
  label: string;
  value: string;
  detail: string;
};

export type InventoryItem = {
  department: string;
  on_hand: string;
  lead_region: string;
  status: string;
  note: string;
};

export type FulfillmentItem = {
  stage: string;
  title: string;
  detail: string;
};

export type CampaignOption = {
  name: string;
  description: string;
};

export type ActivityItem = {
  happened_at: string;
  detail: string;
};

export type AdminDashboardPayload = {
  metrics: AdminMetric[];
  inventory: InventoryItem[];
  fulfillment: FulfillmentItem[];
  campaigns: CampaignOption[];
  activity: ActivityItem[];
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CreateOrderItemInput = {
  product_id: number;
  quantity: number;
};

export type CreateOrderInput = {
  customer_name: string;
  customer_email: string;
  items: CreateOrderItemInput[];
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type Order = {
  id: number;
  customer_name: string;
  customer_email: string;
  subtotal_cents: number;
  created_at: string;
  items: OrderItem[];
};

export type CustomerPortalProfile = {
  id: number;
  customer_name: string;
  customer_email: string;
  membership_tier: string;
  points_balance: number;
  lifetime_purchase_cents: number;
  total_orders: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCustomerPortalProfileInput = {
  customer_name: string;
  customer_email: string;
  membership_tier: string;
  points_balance: number;
  lifetime_purchase_cents: number;
  total_orders: number;
};

export type UpdateCustomerPortalProfileInput = CreateCustomerPortalProfileInput;

export type Role = {
  id: number;
  name: string;
  description: string;
  is_super_admin: boolean;
  created_at: string;
};

export type CreateRoleInput = {
  name: string;
  description: string;
};

export type UpdateRoleInput = {
  name: string;
  description: string;
};

export type PermissionPage = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type RolePagePermission = {
  role_id: number;
  page_id: number;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type UpdateRolePagePermissionInput = RolePagePermission;

export type PermissionsPayload = {
  roles: Role[];
  pages: PermissionPage[];
  permissions: RolePagePermission[];
};
