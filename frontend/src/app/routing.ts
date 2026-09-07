import type { LegalSlug } from "../modules/legal/content";

export type { LegalSlug };

export type View = "landing" | "store" | "product" | "admin" | "forbidden" | "not-found" | "legal";

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
