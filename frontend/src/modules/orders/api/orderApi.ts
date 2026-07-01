import { fallbackOrders } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type { CreateOrderInput, Order } from "../types";

export function fetchOrders(): Promise<Order[]> {
  return fetchJson("/api/admin/orders", fallbackOrders);
}

export function checkout(input: CreateOrderInput): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/checkout", input);
}

export function createAdminOrder(input: CreateOrderInput, adminRoleId: number): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/admin/orders", input, adminRoleId);
}

export function updateAdminOrder(
  orderId: number,
  input: CreateOrderInput,
  adminRoleId: number
): Promise<Order> {
  return putJson<CreateOrderInput, Order>(`/api/admin/orders/${orderId}`, input, adminRoleId);
}

export function deleteAdminOrder(orderId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/orders/${orderId}`, adminRoleId);
}
