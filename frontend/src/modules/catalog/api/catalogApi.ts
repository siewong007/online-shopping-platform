import { fallbackCatalog } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  AdminCatalogPayload,
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductStockInput,
  ProductRestockResult
} from "../types";

export function fetchAdminCatalog(): Promise<AdminCatalogPayload> {
  return fetchJson("/api/admin/catalog", fallbackCatalog);
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return postJson<CreateCategoryInput, Category>("/api/admin/categories", input);
}

export function updateCategory(
  slug: string,
  input: UpdateCategoryInput
): Promise<Category> {
  return putJson<UpdateCategoryInput, Category>(
    `/api/admin/categories/${encodeURIComponent(slug)}`,
    input
  );
}

export function deleteCategory(slug: string): Promise<void> {
  return deleteJson(`/api/admin/categories/${encodeURIComponent(slug)}`);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return postJson<CreateProductInput, Product>("/api/admin/products", input);
}

export function updateProduct(
  productId: number,
  input: UpdateProductInput
): Promise<Product> {
  return putJson<UpdateProductInput, Product>(`/api/admin/products/${productId}`, input);
}

export function deleteProduct(productId: number): Promise<void> {
  return deleteJson(`/api/admin/products/${productId}`);
}

export function updateProductStock(
  productId: number,
  input: UpdateProductStockInput
): Promise<Product> {
  return putJson<UpdateProductStockInput, Product>(
    `/api/admin/products/${productId}/stock`,
    input
  );
}

export function supplierSync(): Promise<ProductRestockResult[]> {
  return postJson<undefined, ProductRestockResult[]>("/api/admin/inventory/supplier-sync", undefined);
}
