import type { LegalSlug } from "../modules/legal/content";
import { JOB_LENSES, type JobLensId } from "../modules/storefront/jobLenses";
import type { StorefrontSort } from "../types";

export type { LegalSlug };

export type View = "landing" | "store" | "product" | "admin" | "forbidden" | "not-found" | "legal";

export type ShopFilterState = {
  q: string;
  category: string;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  sort: StorefrontSort;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  jobId: JobLensId | null;
};

export const DEFAULT_SHOP_FILTER_STATE: ShopFilterState = {
  q: "",
  category: "all",
  minPriceCents: null,
  maxPriceCents: null,
  sort: "featured",
  inStockOnly: false,
  onSaleOnly: false,
  jobId: null
};

const VALID_SORTS = new Set<StorefrontSort>(["featured", "price_asc", "price_desc", "name"]);
const VALID_JOBS = new Set<JobLensId>(JOB_LENSES.map((job) => job.id));
const MANAGED_SHOP_QUERY_KEYS = [
  "q",
  "category",
  "min",
  "max",
  "sort",
  "in_stock",
  "sale",
  "job"
] as const;

function parsePriceParamCents(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function formatPriceParamRm(cents: number): string {
  const rm = cents / 100;
  return Number.isInteger(rm) ? String(rm) : rm.toFixed(2).replace(/\.?0+$/, "");
}

function parseBoolParam(raw: string | null): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

export function parseShopFilterSearch(search: string): ShopFilterState {
  const params = new URLSearchParams(search);
  const rawCategory = params.get("category")?.trim() ?? "";
  const rawSort = params.get("sort")?.trim() as StorefrontSort | undefined;
  const rawJob = params.get("job")?.trim() as JobLensId | undefined;
  const minPriceCents = parsePriceParamCents(params.get("min"));
  const maxPriceCents = parsePriceParamCents(params.get("max"));

  return {
    q: params.get("q")?.trim() ?? "",
    category: rawCategory || "all",
    minPriceCents,
    maxPriceCents:
      minPriceCents !== null && maxPriceCents !== null && maxPriceCents < minPriceCents
        ? null
        : maxPriceCents,
    sort: rawSort && VALID_SORTS.has(rawSort) ? rawSort : "featured",
    inStockOnly: parseBoolParam(params.get("in_stock")),
    onSaleOnly: parseBoolParam(params.get("sale")),
    jobId: rawJob && VALID_JOBS.has(rawJob) ? rawJob : null
  };
}

export function buildShopFilterSearch(state: ShopFilterState, existingSearch = ""): string {
  const params = new URLSearchParams(existingSearch);
  for (const key of MANAGED_SHOP_QUERY_KEYS) {
    params.delete(key);
  }

  const trimmedQuery = state.q.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (state.category && state.category !== "all") params.set("category", state.category);
  if (state.minPriceCents !== null && state.minPriceCents >= 0) {
    params.set("min", formatPriceParamRm(state.minPriceCents));
  }
  if (state.maxPriceCents !== null && state.maxPriceCents >= 0) {
    params.set("max", formatPriceParamRm(state.maxPriceCents));
  }
  if (state.sort && state.sort !== "featured" && VALID_SORTS.has(state.sort)) {
    params.set("sort", state.sort);
  }
  if (state.inStockOnly) params.set("in_stock", "1");
  if (state.onSaleOnly) params.set("sale", "1");
  if (state.jobId && VALID_JOBS.has(state.jobId)) params.set("job", state.jobId);

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export const LEGAL_ROUTES: Record<string, LegalSlug> = {
  "/privacy": "privacy",
  "/terms": "terms",
  "/returns": "returns",
  "/delivery": "delivery",
  "/contact": "contact"
};

export function viewFromPath(pathname: string): View {
  if (pathname === "/admin") return "admin";
  if (productIdFromPath(pathname) !== null) return "product";
  if (pathname === "/shop") return "store";
  if (pathname === "/forbidden") return "forbidden";
  if (legalSlugFromPath(pathname) !== null) return "legal";
  if (pathname === "/") return "landing";
  return "not-found";
}

export function legalSlugFromPath(pathname: string): LegalSlug | null {
  return LEGAL_ROUTES[pathname] ?? null;
}

export function productIdFromPath(pathname: string): number | null {
  const match = /^\/shop\/products\/(\d+)$/.exec(pathname);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}
