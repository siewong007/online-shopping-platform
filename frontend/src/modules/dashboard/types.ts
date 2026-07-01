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
