import { afterEach, describe, expect, mock, test } from "bun:test";

import { fetchAdminCatalog } from "../../src/modules/catalog/api/catalogApi";
import { setAuthToken } from "../../src/shared/api/http";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthToken(null);
  mock.restore();
});

type CapturedRequest = {
  authorization: string | null;
  body: string | null;
  contentType: string | null;
  method: string;
  url: string;
};

const catalogPayload = {
  categories: [{ slug: "tools", name: "Tools", teaser: "Tools and accessories" }],
  products: [
    {
      id: 101,
      name: "P0-INV-01 Low Stock Product",
      category_slug: "tools",
      price_cents: 1299,
      badge: "Test",
      description: "Below its low-stock threshold on purpose.",
      tone: "Test",
      featured: false,
      stock_quantity: 2,
      low_stock_threshold: 5,
      image_url: "",
      avg_rating: null,
      review_count: 0
    }
  ]
};

function captureRequest(input: RequestInfo | URL, init?: RequestInit): CapturedRequest {
  const headers = new Headers(init?.headers);

  return {
    authorization: headers.get("Authorization"),
    body: typeof init?.body === "string" ? init.body : null,
    contentType: headers.get("Content-Type"),
    method: init?.method ?? "GET",
    url: String(input)
  };
}

describe("admin catalog refresh is read-only", () => {
  test("reloads current catalogue data with a plain GET to /api/admin/catalog", async () => {
    setAuthToken("admin-token");
    const requests: CapturedRequest[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(captureRequest(input, init));
      return Promise.resolve(Response.json(catalogPayload));
    });

    await expect(fetchAdminCatalog()).resolves.toEqual(catalogPayload);

    expect(requests).toEqual([
      {
        authorization: "Bearer admin-token",
        body: null,
        contentType: null,
        method: "GET",
        url: "http://localhost:4000/api/admin/catalog"
      }
    ]);
  });

  test("the admin API client exposes no supplier-sync mutation operation", async () => {
    const api = await import("../../src/lib/api");
    const catalogApi = await import("../../src/modules/catalog/api/catalogApi");

    expect(api).not.toHaveProperty("supplierSync");
    expect(catalogApi).not.toHaveProperty("supplierSync");
  });
});
