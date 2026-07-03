import { postJson, putJson } from "../../../shared/api/http";
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateProductInput
} from "../types";

export function createCategory(input: CreateCategoryInput, adminRoleId: number): Promise<Category> {
  return postJson<CreateCategoryInput, Category>("/api/admin/categories", input, adminRoleId);
}

export function createProduct(input: CreateProductInput, adminRoleId: number): Promise<Product> {
  return postJson<CreateProductInput, Product>("/api/admin/products", input, adminRoleId);
}

export function updateProduct(
  productId: number,
  input: UpdateProductInput,
  adminRoleId: number
): Promise<Product> {
  return putJson<UpdateProductInput, Product>(
    `/api/admin/products/${productId}`,
    input,
    adminRoleId
  );
}
