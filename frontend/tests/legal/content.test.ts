import { describe, expect, test } from "bun:test";

import { translations } from "../../src/i18n/translations";
import { LEGAL_DOCUMENTS } from "../../src/modules/legal/content";

describe("customer-facing business claims", () => {
  test("does not publish owner-unconfirmed trading history, hours, return windows or brand guarantees", () => {
    const content = JSON.stringify({ translations, legal: LEGAL_DOCUMENTS });

    expect(content).not.toMatch(/since 2017|sejak 2017|始于 2017/i);
    expect(content).not.toMatch(/8(?:\:00)?\s*(?:am|pagi)|9(?:\:00)?\s*(?:am|pagi)/i);
    expect(content).not.toMatch(/within 7 days|within 7 working days/i);
    expect(content).not.toMatch(/authorised distributors|full warranty|no fakes|price matching/i);
  });
});
