export type SalesStatus = "confirmed" | "processing" | "paid" | "fulfilled" | "cancelled";
export type SalesPaymentStatus = "unpaid" | "paid";

export type SalesRecord = {
  order_id: number;
  customer_name: string;
  customer_email: string;
  subtotal_cents: number;
  status: SalesStatus;
  payment_status: SalesPaymentStatus;
  channel: string;
  sales_rep: string;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
};

export type UpdateSalesDetailsInput = {
  channel: string;
  sales_rep: string;
  discount_cents: number;
};

export type UpdateSalesStatusInput = {
  status: string;
  note: string;
};

export type SalesStatusCount = {
  status: string;
  count: number;
  total_cents: number;
};

export type SalesChannelCount = {
  channel: string;
  count: number;
  total_cents: number;
};

export type SalesSummaryPayload = {
  total_revenue_cents: number;
  order_count: number;
  by_status: SalesStatusCount[];
  by_channel: SalesChannelCount[];
};
