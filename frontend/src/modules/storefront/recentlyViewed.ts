import type { Product } from "../../types";

export const RECENTLY_VIEWED_STORAGE_KEY = "ekoway_recently_viewed_v1";
const MAX_RECENTLY_VIEWED = 8;

export function readRecentlyViewed(storage?: Storage): Product[] {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return [];
  try {
    const raw = target.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Product =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Product).id === "number" &&
        typeof (item as Product).name === "string"
    );
  } catch {
    return [];
  }
}

export function writeRecentlyViewed(items: Product[], storage?: Storage): void {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return;
  try {
    target.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota or private browsing errors cleanly.
  }
}

export function recordRecentlyViewed(current: Product[], product: Product): Product[] {
  const next = [product, ...current.filter((item) => item.id !== product.id)];
  return next.slice(0, MAX_RECENTLY_VIEWED);
}
