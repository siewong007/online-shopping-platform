import { afterEach, describe, expect, mock, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { startPaymentCheckout } from "../../src/modules/orders/api/orderApi";
import type { CreateOrderInput, PaymentCheckout } from "../../src/modules/orders/types";
import { setAuthToken, setCustomerAuthToken, setSupportAuthToken } from "../../src/shared/api/http";

const originalFetch = globalThis.fetch;
const sourceRoot = join(import.meta.dir, "..", "..", "src");

const checkoutInput: CreateOrderInput = {
  customer_name: "Ordinary Shopper",
  customer_email: "shopper@example.com",
  customer_phone: "0123456789",
  fulfillment_method: "pickup",
  items: [{ product_id: 71, quantity: 1 }]
};

const checkoutResponse: PaymentCheckout = {
  order: {
    id: 4021,
    customer_name: "Ordinary Shopper",
    customer_email: "shopper@example.com",
    customer_phone: "0123456789",
    subtotal_cents: 1000,
    discount_cents: 0,
    tax_cents: 0,
    shipping_cents: 0,
    total_cents: 1000,
    fulfillment_status: "received",
    fulfillment_method: "pickup",
    created_at: "2026-08-15T00:00:00Z",
    items: [],
    fulfillment_history: [],
    applied_offers: []
  },
  payment_url: "https://securecheckout.sandbox.hit-pay.com/payment-request/test/checkout",
  provider: "hitpay"
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry) ? [path] : [];
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthToken(null);
  setCustomerAuthToken(null);
  setSupportAuthToken(null);
  mock.restore();
});

describe("payment activation gate has no client-side surface", () => {
  test("the storefront never sends, stores or reads an activation authorization", () => {
    const offenders = sourceFiles(sourceRoot).filter((path) => {
      const contents = readFileSync(path, "utf8").toLowerCase();
      return (
        contents.includes("x-payment-activation") ||
        contents.includes("payment_activation") ||
        contents.includes("activation-grant") ||
        contents.includes("activationgrant")
      );
    });

    expect(offenders).toEqual([]);
  });

  test("secure checkout posts only the customer session, so the mode is decided server-side", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    setSupportAuthToken("support-token");

    let sentHeaders: string[] = [];
    let sentBody = "";
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      sentHeaders = [...new Headers(init?.headers).keys()];
      sentBody = typeof init?.body === "string" ? init.body : "";
      return Promise.resolve(Response.json(checkoutResponse));
    });

    await expect(startPaymentCheckout(checkoutInput)).resolves.toEqual(checkoutResponse);

    expect(sentHeaders.sort()).toEqual(["authorization", "content-type"]);
    expect(sentBody).not.toContain("activation");
  });

  test("a payment_url returned by the API is the only route to a gateway", () => {
    // The client cannot mint a checkout: everything it knows about the provider arrives in the
    // server's response, so there is nothing to flip locally to reach a live payment page.
    const client = readFileSync(join(sourceRoot, "modules", "orders", "api", "orderApi.ts"), "utf8");

    expect(client).toContain('"/api/checkout/payment"');
    expect(client).not.toMatch(/hit-pay|senangpay|payment_url\s*=/i);
  });
});
