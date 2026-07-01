import type { Product } from "../storefront/types";

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

export type OrderControlProduct = Product;
