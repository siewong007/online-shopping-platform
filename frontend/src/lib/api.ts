import {
  fallbackAdminDashboard,
  fallbackCustomerPortalProfiles,
  fallbackOrders,
  fallbackPermissions,
  fallbackStorefront
} from "../data/fallback";
import type {
  AdminDashboardPayload,
  Category,
  CreateCategoryInput,
  CreateCustomerPortalProfileInput,
  CreateOrderInput,
  CreateProductInput,
  CreateRoleInput,
  CustomerPortalProfile,
  Order,
  PermissionsPayload,
  Product,
  Role,
  RolePagePermission,
  StorefrontPayload,
  UpdateCustomerPortalProfileInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const ADMIN_ROLE_HEADER = "X-Admin-Role-Id";

function jsonHeaders(adminRoleId?: number): Record<string, string> {
  return adminRoleId
    ? { "Content-Type": "application/json", [ADMIN_ROLE_HEADER]: String(adminRoleId) }
    : { "Content-Type": "application/json" };
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn("Using fallback data because the API is unavailable.", error);
    return fallback;
  }
}

async function requestJson<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (error) {
    console.warn("Unable to reach the API for a write request.", error);
    throw new Error("This request is temporarily unavailable. Please try again in a moment.");
  }

  if (!response.ok) {
    const message = (await response.text()) || `Request failed for ${path}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
  adminRoleId?: number
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: jsonHeaders(adminRoleId),
    body: JSON.stringify(body)
  });
}

async function putJson<TBody, TResponse>(
  path: string,
  body: TBody,
  adminRoleId?: number
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PUT",
    headers: jsonHeaders(adminRoleId),
    body: JSON.stringify(body)
  });
}

async function deleteJson(path: string, adminRoleId?: number): Promise<void> {
  return requestJson<void>(path, {
    method: "DELETE",
    headers: adminRoleId ? { [ADMIN_ROLE_HEADER]: String(adminRoleId) } : undefined
  });
}

export function fetchStorefront(): Promise<StorefrontPayload> {
  return fetchJson("/api/storefront", fallbackStorefront);
}

export function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  return fetchJson("/api/admin/dashboard", fallbackAdminDashboard);
}

export function fetchOrders(): Promise<Order[]> {
  return fetchJson("/api/admin/orders", fallbackOrders);
}

export function fetchCustomerPortalProfiles(): Promise<CustomerPortalProfile[]> {
  return fetchJson("/api/admin/customer-portal", fallbackCustomerPortalProfiles);
}

export function fetchPermissions(): Promise<PermissionsPayload> {
  return fetchJson("/api/admin/permissions", fallbackPermissions);
}

export function createCategory(input: CreateCategoryInput, adminRoleId: number): Promise<Category> {
  return postJson<CreateCategoryInput, Category>("/api/admin/categories", input, adminRoleId);
}

export function createProduct(input: CreateProductInput, adminRoleId: number): Promise<Product> {
  return postJson<CreateProductInput, Product>("/api/admin/products", input, adminRoleId);
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

export function createCustomerPortalProfile(
  input: CreateCustomerPortalProfileInput,
  adminRoleId: number
): Promise<CustomerPortalProfile> {
  return postJson<CreateCustomerPortalProfileInput, CustomerPortalProfile>(
    "/api/admin/customer-portal",
    input,
    adminRoleId
  );
}

export function updateCustomerPortalProfile(
  profileId: number,
  input: UpdateCustomerPortalProfileInput,
  adminRoleId: number
): Promise<CustomerPortalProfile> {
  return putJson<UpdateCustomerPortalProfileInput, CustomerPortalProfile>(
    `/api/admin/customer-portal/${profileId}`,
    input,
    adminRoleId
  );
}

export function deleteCustomerPortalProfile(profileId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/customer-portal/${profileId}`, adminRoleId);
}

export function createRole(input: CreateRoleInput, adminRoleId: number): Promise<Role> {
  return postJson<CreateRoleInput, Role>("/api/admin/roles", input, adminRoleId);
}

export function updateRole(roleId: number, input: UpdateRoleInput, adminRoleId: number): Promise<Role> {
  return putJson<UpdateRoleInput, Role>(`/api/admin/roles/${roleId}`, input, adminRoleId);
}

export function deleteRole(roleId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/roles/${roleId}`, adminRoleId);
}

export function updateRolePermission(
  input: UpdateRolePagePermissionInput,
  adminRoleId: number
): Promise<RolePagePermission> {
  return putJson<UpdateRolePagePermissionInput, RolePagePermission>(
    "/api/admin/role-permissions",
    input,
    adminRoleId
  );
}
