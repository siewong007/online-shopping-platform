import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  createSupportConversation,
  normalizeSupportConversationPage,
  normalizeSupportMessages
} from "../../src/modules/support/api/supportApi";
import type { SupportMessage } from "../../src/modules/support/types";
import {
  getAuthToken,
  getCustomerAuthToken,
  getSupportAuthToken,
  requestJson,
  setAuthToken,
  setCustomerAuthToken,
  setSupportAuthToken
} from "../../src/shared/api/http";

const originalFetch = globalThis.fetch;

const message: SupportMessage = {
  id: 11,
  conversation_id: 7,
  author_kind: "guest",
  admin_user_id: null,
  body: "Need help with a drill.",
  created_at: "2026-07-16T10:00:00Z"
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthToken(null);
  setCustomerAuthToken(null);
  setSupportAuthToken(null);
  mock.restore();
});

describe("support API authentication", () => {
  test("keeps support, customer, admin, and public request tokens isolated", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    setSupportAuthToken("support-token");
    const authorizationHeaders: Array<string | null> = [];
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      authorizationHeaders.push(new Headers(init?.headers).get("Authorization"));
      return Promise.resolve(Response.json({ ok: true }));
    });

    await requestJson("/api/admin/example");
    await requestJson("/api/account/example", {}, "customer");
    await requestJson("/api/support/example", {}, "support");
    await requestJson("/api/public/example", {}, "public");

    expect(authorizationHeaders).toEqual([
      "Bearer admin-token",
      "Bearer customer-token",
      "Bearer support-token",
      null
    ]);
    expect(getSupportAuthToken()).toBe("support-token");
  });

  test("creates an anonymous conversation without an admin or stale support token", async () => {
    setAuthToken("admin-token");
    setSupportAuthToken("stale-support-token");
    const requests: Array<{ body: string | null; authorization: string | null; url: string }> = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        body: typeof init?.body === "string" ? init.body : null,
        authorization: new Headers(init?.headers).get("Authorization"),
        url: String(input)
      });
      return Promise.resolve(Response.json({ token: "new-support-token", conversation: {}, messages: [message] }));
    });

    await createSupportConversation({
      guest_name: "Aida",
      guest_email: "aida@example.com",
      message: message.body
    });

    expect(requests).toEqual([
      {
        body: JSON.stringify({
          guest_name: "Aida",
          guest_email: "aida@example.com",
          message: "Need help with a drill."
        }),
        authorization: null,
        url: "http://localhost:4000/api/support/conversations"
      }
    ]);
  });

  test("uses a verified customer token for conversation creation and normalizes list envelopes", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("customer-token");
    const authorizationHeaders: Array<string | null> = [];
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      authorizationHeaders.push(new Headers(init?.headers).get("Authorization"));
      return Promise.resolve(Response.json({ token: "new-support-token", conversation: {}, messages: [message] }));
    });

    await createSupportConversation({
      guest_name: "Aida",
      guest_email: "aida@example.com",
      message: message.body
    });

    expect(authorizationHeaders).toEqual(["Bearer customer-token"]);
    expect(normalizeSupportMessages([message])).toEqual([message]);
    expect(normalizeSupportMessages({ items: [message] })).toEqual([message]);
    expect(normalizeSupportMessages({ messages: [message] })).toEqual([message]);
    expect(normalizeSupportConversationPage([])).toEqual({ items: [], next_cursor: null });
  });

  test("retries a 401 customer conversation creation once as an anonymous request", async () => {
    setAuthToken("admin-token");
    setCustomerAuthToken("expired-customer-token");
    setSupportAuthToken("support-token");
    const authorizationHeaders: Array<string | null> = [];
    let requestCount = 0;
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      authorizationHeaders.push(new Headers(init?.headers).get("Authorization"));
      requestCount += 1;

      if (requestCount === 1) {
        return Promise.resolve(Response.json({ message: "Customer session expired" }, { status: 401 }));
      }

      return Promise.resolve(Response.json({ token: "new-support-token", conversation: {}, messages: [message] }));
    });

    await createSupportConversation({
      guest_name: "Aida",
      guest_email: "aida@example.com",
      message: message.body
    });

    expect(authorizationHeaders).toEqual(["Bearer expired-customer-token", null]);
    expect(getCustomerAuthToken()).toBeNull();
    expect(getAuthToken()).toBe("admin-token");
    expect(getSupportAuthToken()).toBe("support-token");
  });
});
