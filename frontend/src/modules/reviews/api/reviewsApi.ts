import { postJson, requestJson } from "../../../shared/api/http";
import type { CreateReviewInput, ProductDetailPayload, ProductReview } from "../types";

export function fetchProductDetail(productId: number): Promise<ProductDetailPayload> {
  return requestJson<ProductDetailPayload>(`/api/storefront/products/${productId}`, {}, "customer");
}

export function createProductReview(productId: number, input: CreateReviewInput): Promise<ProductReview> {
  return postJson<CreateReviewInput, ProductReview>(
    `/api/account/products/${productId}/reviews`,
    input,
    "customer"
  );
}
