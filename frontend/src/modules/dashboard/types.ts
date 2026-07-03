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

export type LiveDashboardMetrics = {
  revenue_today_cents: number;
  revenue_yesterday_cents: number;
  orders_awaiting_fulfillment: number;
  unpaid_invoice_count: number;
  unpaid_invoice_amount_cents: number;
};

export type AdminDashboardPayload = {
  metrics: AdminMetric[];
  live_metrics: LiveDashboardMetrics;
  inventory: InventoryItem[];
  fulfillment: FulfillmentItem[];
  campaigns: CampaignOption[];
  activity: ActivityItem[];
};
