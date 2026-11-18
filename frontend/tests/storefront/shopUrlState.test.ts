import { describe, expect, test } from "bun:test";

import {
  buildShopFilterSearch,
  DEFAULT_SHOP_FILTER_STATE,
  parseShopFilterSearch,
  type ShopFilterState
} from "../../src/app/routing";

describe("shop URL filter serialization and parsing", () => {
  test("returns empty string for default state", () => {
    expect(buildShopFilterSearch(DEFAULT_SHOP_FILTER_STATE)).toBe("");
    expect(parseShopFilterSearch("")).toEqual(DEFAULT_SHOP_FILTER_STATE);
  });

  test("round-trips filters and converts RM price bounds cleanly", () => {
    const state: ShopFilterState = {
      q: "drill",
      category: "tools",
      minPriceCents: 1250,
      maxPriceCents: 50000,
      sort: "price_asc",
      inStockOnly: true,
      onSaleOnly: true,
      jobId: "cut"
    };

    const encoded = buildShopFilterSearch(state);
    expect(encoded).toBe("?q=drill&category=tools&min=12.5&max=500&sort=price_asc&in_stock=1&sale=1&job=cut");
    expect(parseShopFilterSearch(encoded)).toEqual(state);
  });

  test("falls back safely on invalid sort, price, or job params", () => {
    expect(
      parseShopFilterSearch("?sort=hacked&min=-5&max=abc&job=unknown&in_stock=0")
    ).toEqual(DEFAULT_SHOP_FILTER_STATE);
  });

  test("preserves unrelated query parameters such as payment_return", () => {
    const encoded = buildShopFilterSearch(
      { ...DEFAULT_SHOP_FILTER_STATE, category: "tools" },
      "?payment_return=hitpay&category=old&q=stale"
    );
    expect(encoded).toBe("?payment_return=hitpay&category=tools");
  });
});
