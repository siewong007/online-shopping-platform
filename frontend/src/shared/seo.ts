import { LEGAL_DOCUMENTS, type LegalSlug } from "../modules/legal/content";
import type { View } from "../app/routing";
import { isGenericPlaceholderImage } from "../modules/storefront/listing";
import type { Product } from "../types";

export const SITE_ORIGIN = "https://ekowayhardware.com";

export type RouteSeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: "index, follow" | "noindex, nofollow";
  themeColor: string;
};

const LANDING_DESCRIPTION =
  "Ekoway Hardware (永光五金) — Sibu hardware counter. Power tools, paint, building materials and home essentials in Lorong Salim 17, Sibu, Sarawak.";
const STORE_DESCRIPTION =
  "Browse Ekoway Hardware tools, paint, building materials, lumber, and home essentials online for counter pickup in Sibu, Sarawak.";
const ADMIN_DESCRIPTION = "Ekoway Hardware OPT operations console.";

function summarizeDescription(text: string | undefined, fallback: string): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157).trimEnd()}...`;
}

export function buildRouteSeo({
  view,
  legalSlug,
  product,
  categoryName
}: {
  view: View;
  legalSlug: LegalSlug | null;
  product?: Product | null;
  categoryName?: string | null;
}): RouteSeoMetadata {
  if (view === "landing") {
    return {
      title: "Ekoway Hardware — 永光五金 · Sibu, Sarawak",
      description: LANDING_DESCRIPTION,
      canonicalUrl: `${SITE_ORIGIN}/`,
      robots: "index, follow",
      themeColor: "#000000"
    };
  }

  if (view === "store") {
    return {
      title: "Ekoway Hardware — Shop Online",
      description: STORE_DESCRIPTION,
      canonicalUrl: `${SITE_ORIGIN}/shop`,
      robots: "index, follow",
      themeColor: "#14342a"
    };
  }

  if (view === "product") {
    const productTitle = product
      ? `${product.name} — Ekoway Hardware`
      : "Ekoway Hardware — Shop Online";
    const fallbackDesc = categoryName
      ? `${product?.name ?? "Hardware product"} in ${categoryName} at Ekoway Hardware, Sibu.`
      : STORE_DESCRIPTION;
    return {
      title: productTitle,
      description: summarizeDescription(product?.description, fallbackDesc),
      canonicalUrl: product ? `${SITE_ORIGIN}/shop/products/${product.id}` : `${SITE_ORIGIN}/shop`,
      robots: "index, follow",
      themeColor: "#14342a"
    };
  }

  if (view === "legal" && legalSlug) {
    const doc = LEGAL_DOCUMENTS[legalSlug];
    return {
      title: `${doc.title} — Ekoway Hardware`,
      description: summarizeDescription(doc.intro, LANDING_DESCRIPTION),
      canonicalUrl: `${SITE_ORIGIN}/${legalSlug}`,
      robots: "index, follow",
      themeColor: "#14342a"
    };
  }

  if (view === "admin") {
    return {
      title: "Ekoway Hardware — OPT Console",
      description: ADMIN_DESCRIPTION,
      canonicalUrl: `${SITE_ORIGIN}/admin`,
      robots: "noindex, nofollow",
      themeColor: "#171b20"
    };
  }

  if (view === "forbidden") {
    return {
      title: "Access denied — Ekoway Hardware",
      description: ADMIN_DESCRIPTION,
      canonicalUrl: `${SITE_ORIGIN}/forbidden`,
      robots: "noindex, nofollow",
      themeColor: "#14342a"
    };
  }

  return {
    title: "Page not found — Ekoway Hardware",
    description: LANDING_DESCRIPTION,
    canonicalUrl: `${SITE_ORIGIN}/`,
    robots: "noindex, nofollow",
    themeColor: "#14342a"
  };
}

function upsertMeta(name: string, content: string): void {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

export function applyRouteSeo(meta: RouteSeoMetadata): void {
  document.title = meta.title;
  upsertMeta("description", meta.description);
  upsertMeta("robots", meta.robots);
  upsertMeta("theme-color", meta.themeColor);

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = meta.canonicalUrl;
}

export function buildProductJsonLd({
  product,
  categoryName
}: {
  product: Product;
  categoryName: string;
}): Record<string, unknown> {
  const productUrl = `${SITE_ORIGIN}/shop/products/${product.id}`;
  const productEntity: Record<string, unknown> = {
    "@type": "Product",
    "@id": productUrl,
    name: product.name,
    sku: String(product.id),
    category: categoryName,
    description: summarizeDescription(product.description, `${product.name} — ${categoryName}`),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "MYR",
      price: (product.price_cents / 100).toFixed(2),
      availability:
        product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "HardwareStore",
        name: "Ekoway Hardware"
      }
    }
  };

  if (product.image_url && !isGenericPlaceholderImage(product.image_url)) {
    productEntity.image = [product.image_url];
  }

  if (product.review_count > 0 && product.avg_rating != null) {
    productEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(product.avg_rating.toFixed(1)),
      reviewCount: product.review_count
    };
  }

  const breadcrumbEntity = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_ORIGIN}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop Online",
        item: `${SITE_ORIGIN}/shop`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryName,
        item: `${SITE_ORIGIN}/shop`
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: productUrl
      }
    ]
  };

  return {
    "@context": "https://schema.org",
    "@graph": [breadcrumbEntity, productEntity]
  };
}
