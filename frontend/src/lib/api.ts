import { fallbackAdminDashboard, fallbackStorefront } from "../data/fallback";
import type {
  AdminDashboardPayload,
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  StorefrontPayload
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

async function postJson<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = (await response.text()) || `Request failed for ${path}`;
    throw new Error(message);
  }

  return (await response.json()) as TResponse;
}

export function fetchStorefront(): Promise<StorefrontPayload> {
  return fetchJson("/api/storefront", fallbackStorefront);
}

export function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  return fetchJson("/api/admin/dashboard", fallbackAdminDashboard);
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return postJson<CreateCategoryInput, Category>("/api/admin/categories", input);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return postJson<CreateProductInput, Product>("/api/admin/products", input);
}
