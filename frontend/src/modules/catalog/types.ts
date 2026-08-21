import type { Category, Product, UpdateProductStockInput } from "../storefront/types";

export type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateProductInput
} from "../storefront/types";

export type { UpdateProductStockInput };

export type UpdateCategoryInput = {
  name: string;
  teaser: string;
};

export type AdminCatalogPayload = {
  categories: Category[];
  products: Product[];
};

export type CatalogueImportReport = {
  rows_read: number;
  products_created: number;
  products_updated: number;
  categories_created: number;
  problems: string[];
};

export type ProductImageImportReport = {
  dry_run: boolean;
  rows_read: number;
  rows_pending: number;
  approved_rows: number;
  products_matched: number;
  products_updated: number;
  products_unchanged: number;
  problems: string[];
};
