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
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
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
  fulfillment_status: FulfillmentStatus;
  fulfillment_method: FulfillmentMethod;
  created_at: string;
  items: OrderItem[];
  fulfillment_history: OrderFulfillmentHistory[];
};

export type UpdateOrderFulfillmentInput = {
  to_status: FulfillmentStatus;
  note: string;
};

export type OrderControlProduct = Product;
