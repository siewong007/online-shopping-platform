import type { Category, Product, UpdateProductStockInput, ProductRestockResult } from "../storefront/types";

export type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateProductInput
} from "../storefront/types";

export type { UpdateProductStockInput, ProductRestockResult };

export type UpdateCategoryInput = {
  name: string;
  teaser: string;
};

export type AdminCatalogPayload = {
  categories: Category[];
  products: Product[];
};
