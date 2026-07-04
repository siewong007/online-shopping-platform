import { fallbackStorefront } from "../../../data/fallback";
import { fetchJsonResult } from "../../../shared/api/http";
import type { Product, StorefrontPayload, StorefrontQueryParams, StorefrontSort } from "../types";

function isValidPriceCents(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function matchesQuery(product: Product, params: StorefrontQueryParams): boolean {
  const search = params.q?.trim().toLowerCase();
  if (search) {
    const haystack = `${product.name} ${product.description} ${product.badge}`.toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (params.category && params.category !== "all" && product.category_slug !== params.category) {
    return false;
  }

  if (isValidPriceCents(params.minPriceCents) && product.price_cents < params.minPriceCents) {
    return false;
  }

  if (isValidPriceCents(params.maxPriceCents) && product.price_cents > params.maxPriceCents) {
    return false;
  }

  return true;
}

function sortProducts(products: Product[], sort?: StorefrontSort): Product[] {
  const sorted = [...products];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.price_cents - b.price_cents);
    case "price_desc":
      return sorted.sort((a, b) => b.price_cents - a.price_cents);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

function buildQueryString(params?: StorefrontQueryParams): string {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.category && params.category !== "all") {
    search.set("category", params.category);
  }

  if (isValidPriceCents(params.minPriceCents)) {
    search.set("min_price_cents", String(params.minPriceCents));
  }

  if (isValidPriceCents(params.maxPriceCents)) {
    search.set("max_price_cents", String(params.maxPriceCents));
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchStorefront(params?: StorefrontQueryParams): Promise<StorefrontPayload> {
  const { data: payload, isFallback } = await fetchJsonResult(
    `/api/storefront${buildQueryString(params)}`,
    fallbackStorefront
  );

  if (!isFallback || !params) {
    return payload;
  }

  return {
    ...payload,
    products: sortProducts(payload.products.filter((product) => matchesQuery(product, params)), params.sort)
  };
}
