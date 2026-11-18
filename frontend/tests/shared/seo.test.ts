import { describe, expect, test } from "bun:test";

import { buildProductJsonLd, buildRouteSeo } from "../../src/shared/seo";
import type { Product } from "../../src/types";

const sampleProduct: Product = {
  id: 42,
  name: "Makita 18V Brushless Driver Drill",
  category_slug: "tools",
  price_cents: 45900,
  badge: "In Store",
  description: "Compact brushless driver drill with two batteries and charger.",
  tone: "Makita",
  featured: true,
  stock_quantity: 8,
  low_stock_threshold: 2,
  image_url: "https://ekowayhardware.com/images/makita-drill.jpg",
  avg_rating: 4.8,
  review_count: 5
};

describe("route SEO metadata and PDP JSON-LD", () => {
  test("builds indexable product metadata with canonical link", () => {
    const meta = buildRouteSeo({
      view: "product",
      legalSlug: null,
      product: sampleProduct,
      categoryName: "Power Tools"
    });
    expect(meta.title).toBe("Makita 18V Brushless Driver Drill — Ekoway Hardware");
    expect(meta.canonicalUrl).toBe("https://ekowayhardware.com/shop/products/42");
    expect(meta.robots).toBe("index, follow");
    expect(meta.themeColor).toBe("#14342a");
  });

  test("marks admin and status routes noindex, nofollow", () => {
    expect(buildRouteSeo({ view: "admin", legalSlug: null }).robots).toBe("noindex, nofollow");
    expect(buildRouteSeo({ view: "not-found", legalSlug: null }).robots).toBe("noindex, nofollow");
    expect(buildRouteSeo({ view: "forbidden", legalSlug: null }).robots).toBe("noindex, nofollow");
  });

  test("builds Schema.org Product and BreadcrumbList JSON-LD", () => {
    const graph = buildProductJsonLd({ product: sampleProduct, categoryName: "Power Tools" })[
      "@graph"
    ] as Record<string, unknown>[];
    expect(graph).toHaveLength(2);
    expect(graph[0]["@type"]).toBe("BreadcrumbList");
    const product = graph[1];
    expect(product["@type"]).toBe("Product");
    expect(product.sku).toBe("42");
    expect((product.offers as Record<string, unknown>).price).toBe("459.00");
    expect((product.offers as Record<string, unknown>).priceCurrency).toBe("MYR");
    expect((product.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/InStock"
    );
    expect((product.aggregateRating as Record<string, unknown>).reviewCount).toBe(5);
  });
});
