import { fallbackStorefront } from "../../../data/fallback";
import { fetchJson } from "../../../shared/api/http";
import type { StorefrontPayload } from "../types";

export function fetchStorefront(): Promise<StorefrontPayload> {
  return fetchJson("/api/storefront", fallbackStorefront);
}
