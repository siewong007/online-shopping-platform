import { describe, expect, test } from "bun:test";

import {
  appendProductToCart,
  removeProductFromStorefront,
  removeStorefrontCategory,
  replaceStorefrontCategory,
  resolveCategoryHint,
  setCartItemQuantity,
  syncProductInStorefront,
  upsertStorefrontCategory
} from "../../src/app/storefrontSync";
import type { Category, Product, StorefrontPayload } from "../../src/types";

const categories: Category[] = [
  { slug: "all", name: "All Departments", teaser: "Everything" },
  { slug: "power-tools", name: "Power Tools", teaser: "Drills and saws" },
  { slug: "plumbing-sanitary", name: "Bathroom & Plumbing", teaser: "Pipes and taps" }
];

function sampleProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 101,
    name: "Cordless Hammer Drill",
    category_slug: "power-tools",
    price_cents: 32900,
    badge: "In Stock",
    description: "Brushless 18V hammer drill",
    tone: "professional",
    avg_rating: null,
    review_count: 0,
    image_url: "",
    featured: true,
    stock_quantity: 5,
    low_stock_threshold: 2,
    ...overrides
  };
}

function sampleStorefront(products: Product[] = [sampleProduct()]): StorefrontPayload {
  return {
    categories,
    products,
    total_products: products.length,
    category_counts: [],
    promotions: [],
    services: [],
    pro_stats: []
  };
}

describe("resolveCategoryHint", () => {
  test("prefers exact slug matches across pipe-separated hints before partial matches", () => {
    expect(resolveCategoryHint(categories, "missing|plumbing-sanitary|power")).toBe(
      "plumbing-sanitary"
    );
    expect(resolveCategoryHint(categories, "bathroom")).toBe("plumbing-sanitary");
    expect(resolveCategoryHint(categories, "all-items")).toBe("all");
  });
});

describe("cart stock guards", () => {
  test("rejects zero-stock additions and clamps quantities to available stock", () => {
    const outOfStock = sampleProduct({ stock_quantity: 0 });
    expect(appendProductToCart([], outOfStock, 2)).toEqual({
      nextCart: [],
      addedCount: 0,
      stockLimit: 0
    });

    const drill = sampleProduct({ stock_quantity: 3 });
    const first = appendProductToCart([], drill, 2);
    expect(first.addedCount).toBe(2);
    expect(first.nextCart).toEqual([{ product: drill, quantity: 2 }]);

    const second = appendProductToCart(first.nextCart, drill, 4);
    expect(second.addedCount).toBe(1);
    expect(second.nextCart).toEqual([{ product: drill, quantity: 3 }]);
  });

  test("updates cart item quantities within stock limits and removes exhausted items", () => {
    const drill = sampleProduct({ stock_quantity: 4 });
    const initial = [{ product: drill, quantity: 2 }];

    expect(setCartItemQuantity(initial, drill.id, 10)).toEqual([{ product: drill, quantity: 4 }]);
    expect(setCartItemQuantity(initial, drill.id, 0)).toEqual([]);
    expect(setCartItemQuantity(initial, drill.id, 2, sampleProduct({ stock_quantity: 0 }))).toEqual(
      []
    );
  });
});

describe("storefront admin catalog synchronization", () => {
  test("publishes featured products and hides unpublished updates", () => {
    const initial = sampleStorefront([]);
    const draftProduct = sampleProduct({ id: 202, featured: false });
    expect(syncProductInStorefront(initial, draftProduct, "create")?.products).toEqual([]);

    const published = sampleProduct({ id: 202, featured: true });
    const afterCreate = syncProductInStorefront(initial, published, "create");
    expect(afterCreate?.products).toEqual([published]);

    const unpublished = { ...published, featured: false };
    expect(syncProductInStorefront(afterCreate, unpublished, "update")?.products).toEqual([]);
  });

  test("upserts, replaces, and removes categories and products cleanly", () => {
    const initial = sampleStorefront();
    const paint: Category = { slug: "paint", name: "Paint", teaser: "Coatings" };

    const withPaint = upsertStorefrontCategory(initial, paint);
    expect(withPaint?.categories.map((c) => c.slug)).toContain("paint");

    const renamed = replaceStorefrontCategory(withPaint, { ...paint, name: "Nippon Paint" });
    expect(renamed?.categories.find((c) => c.slug === "paint")?.name).toBe("Nippon Paint");

    const withoutPaint = removeStorefrontCategory(renamed, "paint");
    expect(withoutPaint?.categories.some((c) => c.slug === "paint")).toBe(false);

    const withoutProduct = removeProductFromStorefront(withoutPaint, 101);
    expect(withoutProduct?.products).toEqual([]);
  });
});
