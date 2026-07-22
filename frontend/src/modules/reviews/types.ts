import type { Product } from "../storefront/types";

export type ProductReview = {
  id: number;
  customer_display_name: string;
  rating: number;
  body: string;
  created_at: string;
};

export type ProductDetailPayload = {
  product: Product;
  reviews: ProductReview[];
  can_review: boolean;
  already_reviewed: boolean;
};

export type CreateReviewInput = {
  rating: number;
  body: string;
};
