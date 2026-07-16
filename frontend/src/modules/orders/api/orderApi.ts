import { fallbackOrders } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import {
  adminListPath,
  normalizePagedResponse,
  type AdminListParams,
  type PagedResponse
} from "../../../shared/api/pagination";
import type {
  CheckoutQuote,
  CheckoutQuoteInput,
  CreateOrderInput,
  Order,
  UpdateOrderFulfillmentInput
} from "../types";

export function fetchOrders(params: AdminListParams = {}): Promise<PagedResponse<Order>> {
  return fetchJson<Order[] | PagedResponse<Order>>(
    adminListPath("/api/admin/orders", params),
    fallbackOrders
  ).then(normalizePagedResponse);
}

export function checkout(input: CreateOrderInput): Promise<Order> {
  return postJson<CreateOrderInput, Order>("/api/checkout", input, "customer");
}

export function quoteCheckout(input: CheckoutQuoteInput): Promise<CheckoutQuote> {
  return postJson<CheckoutQuoteInput, CheckoutQuote>("/api/checkout/quote", input, "customer");
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
