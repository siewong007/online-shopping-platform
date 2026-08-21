import { describe, expect, test } from "bun:test";

import { currencyFromCents } from "../../src/shared/formatters";

describe("Malaysian storefront formatting", () => {
  test("formats money as Malaysian Ringgit", () => {
    const formatted = currencyFromCents(12345);

    expect(formatted).toContain("RM");
    expect(formatted).toContain("123.45");
    expect(formatted).not.toContain("$");
  });
});
