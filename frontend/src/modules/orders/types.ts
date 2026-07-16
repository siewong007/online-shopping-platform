import type { Product } from "../storefront/types";

export type FulfillmentMethod = "pickup" | "delivery";
export type FulfillmentStatus =
  | "received"
  | "picking"
  | "packed"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "delivered"
  | "canceled";

export type CreateOrderItemInput = {
  product_id: number;
  quantity: number;
};

export type CreateOrderInput = {
  customer_name: string;
  customer_email: string;
  fulfillment_method?: FulfillmentMethod;
  items: CreateOrderItemInput[];
  promotion_id?: number;
  voucher_code?: string;
};

export type CheckoutQuoteInput = {
  items: CreateOrderItemInput[];
  promotion_id?: number;
  voucher_code?: string;
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type AppliedOffer = {
  promotion_id: number | null;
  voucher_id: number | null;
  discount_cents: number;
  label: string;
  code: string | null;
};

export type CheckoutQuote = {
  items: OrderItem[];
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  applied_offers: AppliedOffer[];
};

export type OrderFulfillmentHistory = {
  id: number;
  order_id: number;
  from_status: FulfillmentStatus | null;
  to_status: FulfillmentStatus;
  note: string;
  changed_by: string;
  happened_at: string;
};

export type Order = {
  id: number;
  customer_name: string;
  customer_email: string;
  subtotal_cents: number;
  discount_cents?: number;
  tax_cents?: number;
  total_cents?: number;
  fulfillment_status: FulfillmentStatus;
  fulfillment_method: FulfillmentMethod;
  created_at: string;
  items: OrderItem[];
  fulfillment_history: OrderFulfillmentHistory[];
  applied_offers?: AppliedOffer[];
};

export type UpdateOrderFulfillmentInput = {
  to_status: FulfillmentStatus;
  note: string;
};

export type OrderControlProduct = Product;
