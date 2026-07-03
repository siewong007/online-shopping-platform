import { fallbackStorefront } from "../../../data/fallback";
import { fetchJson } from "../../../shared/api/http";
import type { Product, StorefrontPayload, StorefrontQueryParams, StorefrontSort } from "../types";

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

  if (params.minPriceCents != null && product.price_cents < params.minPriceCents) {
    return false;
  }

  if (params.maxPriceCents != null && product.price_cents > params.maxPriceCents) {
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

  if (params.minPriceCents != null) {
    search.set("min_price_cents", String(params.minPriceCents));
  }

  if (params.maxPriceCents != null) {
    search.set("max_price_cents", String(params.maxPriceCents));
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchStorefront(params?: StorefrontQueryParams): Promise<StorefrontPayload> {
  const payload = await fetchJson(`/api/storefront${buildQueryString(params)}`, fallbackStorefront);

  if (payload !== fallbackStorefront || !params) {
    return payload;
  }

  return {
    ...payload,
    products: sortProducts(payload.products.filter((product) => matchesQuery(product, params)), params.sort)
  };
}
