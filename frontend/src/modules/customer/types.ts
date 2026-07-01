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
