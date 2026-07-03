import type { Category, Product } from "../storefront/types";

export type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateProductInput
} from "../storefront/types";

export type UpdateCategoryInput = {
  name: string;
  teaser: string;
};

export type AdminCatalogPayload = {
  categories: Category[];
  products: Product[];
};
