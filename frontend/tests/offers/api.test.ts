import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  createPromotion,
  createVoucher,
  deletePromotion,
  deleteVoucher,
  fetchPromotions,
  fetchPublicOffers,
  fetchVouchers,
  updatePromotion,
  updateVoucher
} from "../../src/modules/offers/api/offersApi";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  PublicOffersPayload,
  UpdatePromotionInput,
  UpdateVoucherInput
} from "../../src/modules/offers/types";
import { quoteCheckout } from "../../src/modules/orders/api/orderApi";
import type { CheckoutQuote, CheckoutQuoteInput } from "../../src/modules/orders/types";
import { setAuthToken, setCustomerAuthToken, setSupportAuthToken } from "../../src/shared/api/http";

const originalFetch = globalThis.fetch;

type CapturedRequest = {
  authorization: string | null;
  body: string | null;
  contentType: string | null;
  method: string;
  url: string;
};

const publicOffers: PublicOffersPayload = {
  promotions: [
    {
      id: 11,
      label: "Weekend savings",
      title: "15% off tools",
      description: "Save on qualifying tools this weekend.",
      discount_type: "percent_bps",
      discount_value: 1500,
      minimum_subtotal_cents: 5000,
      is_stackable: true
    }
  ],
  vouchers: [
    {
      id: 22,
      code: "WEEKEND10",
      title: "$10 off",
      description: "Save $10 on qualifying purchases.",
      discount_type: "fixed_cents",
      discount_value: 1000,
      minimum_subtotal_cents: 5000,
      is_stackable: true
    }
  ]
};

const promotionInput: CreatePromotionInput = {
  label: "Weekend savings",
  title: "15% off tools",
  description: "Save on qualifying tools this weekend.",
  discount_type: "percent_bps",
  discount_value: 1500,
  minimum_subtotal_cents: 5000,
  starts_at: "2026-07-18T00:00:00Z",
  ends_at: "2026-07-20T23:59:59Z",
  is_active: true,
  is_stackable: true,
  max_redemptions: 200
};

const promotionUpdate: UpdatePromotionInput = {
  label: "Extended weekend savings",
  title: "$20 off tools",
  description: "Save on qualifying tools throughout the extended weekend.",
  discount_type: "fixed_cents",
  discount_value: 2000,
  minimum_subtotal_cents: 10000,
  starts_at: "2026-07-21T00:00:00Z",
  ends_at: null,
  is_active: false,
  is_stackable: false,
  max_redemptions: 100
};

const voucherInput: CreateVoucherInput = {
  code: "WEEKEND10",
  title: "$10 off",
  description: "Save $10 on qualifying purchases.",
  discount_type: "fixed_cents",
  discount_value: 1000,
  minimum_subtotal_cents: 5000,
  starts_at: null,
  ends_at: "2026-07-20T23:59:59Z",
  is_active: true,
  is_stackable: true,
  max_redemptions: 200,
  is_public: true
};

const voucherUpdate: UpdateVoucherInput = {
  code: "WEEKEND15",
  title: "$15 off",
  description: "Save $15 on qualifying purchases this weekend.",
  discount_type: "fixed_cents",
  discount_value: 1500,
  minimum_subtotal_cents: 7500,
  starts_at: "2026-07-21T00:00:00Z",
  ends_at: null,
  is_active: false,
  is_stackable: false,
  max_redemptions: 100,
  is_public: false
};

const quoteInput: CheckoutQuoteInput = {
  items: [{ product_id: 71, quantity: 2 }],
  promotion_id: 11,
  voucher_code: "WEEKEND10"
};

const quoteResponse: CheckoutQuote = {
  items: [
    {
      product_id: 71,
      product_name: "M18 Drill Driver",
      unit_price_cents: 64900,
      quantity: 2
    }
  ],
  subtotal_cents: 129800,
  discount_cents: 20470,
  tax_cents: 8755,
  total_cents: 118085,
  applied_offers: [
    {
      promotion_id: 11,
      voucher_id: null,
      discount_cents: 19470,
      label: "Weekend savings",
      code: null
    },
    {
      promotion_id: null,
      voucher_id: 22,
      discount_cents: 1000,
      label: "$10 off",
      code: "WEEKEND10"
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

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthToken(null);
  setCustomerAuthToken(null);
  setSupportAuthToken(null);
  mock.restore();
});

describe("offers API client", () => {
  test("loads guest-visible offers with the customer session instead of the admin session", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    setSupportAuthToken("support-token");
    const requests: CapturedRequest[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(captureRequest(input, init));
      return Promise.resolve(Response.json(publicOffers));
    });

    await expect(fetchPublicOffers()).resolves.toEqual(publicOffers);

    expect(requests).toEqual([
      {
        authorization: "Bearer customer-token",
        body: null,
        contentType: null,
        method: "GET",
        url: "http://localhost:4000/api/offers"
      }
    ]);
  });

  test("quotes a guest cart with both selected offers through the customer checkout endpoint", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    const requests: CapturedRequest[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(captureRequest(input, init));
      return Promise.resolve(Response.json(quoteResponse));
    });

    await expect(quoteCheckout(quoteInput)).resolves.toEqual(quoteResponse);

    expect(requests).toEqual([
      {
        authorization: "Bearer customer-token",
        body: JSON.stringify(quoteInput),
        contentType: "application/json",
        method: "POST",
        url: "http://localhost:4000/api/checkout/quote"
      }
    ]);
  });

  test("keeps anonymous guest offer and quote requests free of admin authorization", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken(null);
    const requests: CapturedRequest[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const request = captureRequest(input, init);
      requests.push(request);
      return Promise.resolve(Response.json(
        request.url.endsWith("/api/offers") ? publicOffers : quoteResponse
      ));
    });

    await expect(fetchPublicOffers()).resolves.toEqual(publicOffers);
    await expect(quoteCheckout(quoteInput)).resolves.toEqual(quoteResponse);

    expect(requests).toEqual([
      {
        authorization: null,
        body: null,
        contentType: null,
        method: "GET",
        url: "http://localhost:4000/api/offers"
      },
      {
        authorization: null,
        body: JSON.stringify(quoteInput),
        contentType: "application/json",
        method: "POST",
        url: "http://localhost:4000/api/checkout/quote"
      }
    ]);
  });

  test("sends promotion and voucher CRUD requests to the protected admin endpoints", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    const requests: CapturedRequest[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const request = captureRequest(input, init);
      requests.push(request);

      if (request.method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(Response.json(request.method === "GET" ? [] : { id: 1 }));
    });

    await fetchPromotions();
    await createPromotion(promotionInput);
    await updatePromotion(11, promotionUpdate);
    await deletePromotion(11);
    await fetchVouchers();
    await createVoucher(voucherInput);
    await updateVoucher(22, voucherUpdate);
    await deleteVoucher(22);

    expect(requests.map(({ authorization, contentType, method, url }) => ({
      authorization,
      contentType,
      method,
      url
    }))).toEqual([
      {
        authorization: "Bearer admin-token",
        contentType: null,
        method: "GET",
        url: "http://localhost:4000/api/admin/promotions"
      },
      {
        authorization: "Bearer admin-token",
        contentType: "application/json",
        method: "POST",
        url: "http://localhost:4000/api/admin/promotions"
      },
      {
        authorization: "Bearer admin-token",
        contentType: "application/json",
        method: "PUT",
        url: "http://localhost:4000/api/admin/promotions/11"
      },
      {
        authorization: "Bearer admin-token",
        contentType: null,
        method: "DELETE",
        url: "http://localhost:4000/api/admin/promotions/11"
      },
      {
        authorization: "Bearer admin-token",
        contentType: null,
        method: "GET",
        url: "http://localhost:4000/api/admin/vouchers"
      },
      {
        authorization: "Bearer admin-token",
        contentType: "application/json",
        method: "POST",
        url: "http://localhost:4000/api/admin/vouchers"
      },
      {
        authorization: "Bearer admin-token",
        contentType: "application/json",
        method: "PUT",
        url: "http://localhost:4000/api/admin/vouchers/22"
      },
      {
        authorization: "Bearer admin-token",
        contentType: null,
        method: "DELETE",
        url: "http://localhost:4000/api/admin/vouchers/22"
      }
    ]);
    expect(JSON.parse(requests[1].body ?? "")).toEqual(promotionInput);
    expect(JSON.parse(requests[2].body ?? "")).toEqual(promotionUpdate);
    expect(JSON.parse(requests[5].body ?? "")).toEqual(voucherInput);
    expect(JSON.parse(requests[6].body ?? "")).toEqual(voucherUpdate);
  });
});
