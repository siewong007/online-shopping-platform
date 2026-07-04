export type Category = {
  slug: string;
  name: string;
  teaser: string;
};

export type Product = {
  id: number;
  name: string;
  category_slug: string;
  price_cents: number;
  badge: string;
  description: string;
  tone: string;
  featured: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
};

export type CreateCategoryInput = {
  slug: string;
  name: string;
  teaser: string;
};

export type CreateProductInput = {
  name: string;
  category_slug: string;
  price_cents: number;
  badge: string;
  description: string;
  tone: string;
  featured: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url?: string;
};

export type UpdateProductInput = CreateProductInput;

export type UpdateProductStockInput = {
  stock_quantity: number;
  low_stock_threshold: number;
};

export type ProductRestockResult = {
  product_id: number;
  name: string;
  added: number;
};

export type Promotion = {
  label: string;
  title: string;
  description: string;
};

export type ServiceItem = {
  name: string;
  description: string;
};

export type ProStat = {
  label: string;
  value: string;
};

export type StorefrontPayload = {
  categories: Category[];
  products: Product[];
  promotions: Promotion[];
  services: ServiceItem[];
  pro_stats: ProStat[];
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type StorefrontSort = "featured" | "price_asc" | "price_desc" | "name";

export type StorefrontQueryParams = {
  q?: string;
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: StorefrontSort;
};
