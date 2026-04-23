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
