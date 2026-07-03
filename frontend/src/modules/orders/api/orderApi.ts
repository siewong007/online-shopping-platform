import { fallbackOrders } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type { CreateOrderInput, Order, UpdateOrderFulfillmentInput } from "../types";

export function fetchOrders(): Promise<Order[]> {
  return fetchJson("/api/admin/orders", fallbackOrders);
}

export function checkout(input: CreateOrderInput): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/checkout", input);
}

export function createAdminOrder(input: CreateOrderInput): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/admin/orders", input);
}

export function updateAdminOrder(
  orderId: number,
  input: CreateOrderInput
): Promise<Order> {
  return putJson<CreateOrderInput, Order>(`/api/admin/orders/${orderId}`, input);
}

export function updateOrderFulfillment(
  orderId: number,
  input: UpdateOrderFulfillmentInput
): Promise<Order> {
  return putJson<UpdateOrderFulfillmentInput, Order>(
    `/api/admin/orders/${orderId}/fulfillment`,
    input
  );
}

export function deleteAdminOrder(orderId: number): Promise<void> {
  return deleteJson(`/api/admin/orders/${orderId}`);
}
