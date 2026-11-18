import { describe, expect, test } from "bun:test";

import {
  readRecentlyViewed,
  recordRecentlyViewed
} from "../../src/modules/storefront/recentlyViewed";
import type { Product } from "../../src/types";

function makeProduct(id: number): Product {
  return {
    id,
    name: `Product ${id}`,
    category_slug: "tools",
    price_cents: id * 1000,
    badge: "",
    description: "",
    tone: "",
    featured: false,
    stock_quantity: 5,
    low_stock_threshold: 1,
    image_url: "",
    avg_rating: null,
    review_count: 0
  };
}

describe("recentlyViewed store helpers", () => {
  test("deduplicates and maintains MRU ordering capped at 8 items", () => {
    let items: Product[] = [];
    for (let id = 1; id <= 10; id++) {
      items = recordRecentlyViewed(items, makeProduct(id));
    }
    expect(items.map((item) => item.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);

    items = recordRecentlyViewed(items, makeProduct(6));
    expect(items[0].id).toBe(6);
    expect(items.filter((item) => item.id === 6)).toHaveLength(1);
    expect(items).toHaveLength(8);
  });

  test("returns empty array when storage contains malformed data", () => {
    const fakeStorage = {
      getItem: () => "{broken json",
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    } satisfies Storage;

    expect(readRecentlyViewed(fakeStorage)).toEqual([]);
  });
});
