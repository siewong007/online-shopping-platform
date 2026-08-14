import { describe, expect, test } from "bun:test";

import {
  consumePaymentReturn,
  rememberPendingPayment,
  takePendingPayment
} from "../../src/modules/payments/paymentReturn";

describe("hosted payment browser return", () => {
  test("recognises HitPay's storefront return without asserting payment success", () => {
    expect(consumePaymentReturn("?payment_return=hitpay&cart=kept")).toEqual({
      isPaymentReturn: true,
      search: "cart=kept"
    });
  });

  test("retains compatibility with the legacy hosted-gateway marker", () => {
    expect(consumePaymentReturn("?payment=return")).toEqual({
      isPaymentReturn: true,
      search: ""
    });
  });

  test("ignores unrelated or spoofed values", () => {
    expect(consumePaymentReturn("?payment_return=success&payment=paid")).toEqual({
      isPaymentReturn: false,
      search: "payment_return=success&payment=paid"
    });
  });
});

describe("pending hosted payment reference", () => {
  function memoryStorage() {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    };
  }

  test("retains a non-sensitive order reference across the redirect and consumes it once", () => {
    const storage = memoryStorage();
    rememberPendingPayment(storage, { orderId: 42, provider: "HitPay" });

    expect(takePendingPayment(storage)).toEqual({ orderId: 42, provider: "hitpay" });
    expect(takePendingPayment(storage)).toBeNull();
  });

  test("fails closed for malformed or invalid stored references", () => {
    const storage = memoryStorage();
    storage.setItem("ekoway_pending_payment", '{"orderId":0,"provider":"hitpay"}');
    expect(takePendingPayment(storage)).toBeNull();

    storage.setItem("ekoway_pending_payment", "not-json");
    expect(takePendingPayment(storage)).toBeNull();
  });
});
