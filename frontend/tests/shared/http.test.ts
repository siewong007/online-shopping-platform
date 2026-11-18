import { afterEach, describe, expect, jest, mock, test } from "bun:test";

import {
  ApiError,
  fetchJsonResult,
  requestJson,
  setOnApiUnavailable,
  setOnUnauthorized
} from "../../src/shared/api/http";
import { mockFetch } from "../helpers/mockFetch";

const originalFetch = globalThis.fetch;

function expectApiError(error: unknown): ApiError {
  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) {
    throw new Error("Expected an ApiError instance");
  }
  return error;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  setOnApiUnavailable(null);
  setOnUnauthorized(null);
  jest.useRealTimers();
  mock.restore();
});

describe("shared HTTP errors", () => {
  test("normalizes network failures without exposing technical details", async () => {
    globalThis.fetch = mockFetch(() =>
      Promise.reject(new TypeError("fetch failed for https://internal/api?token=secret"))
    );

    const error = expectApiError(
      await requestJson("/api/orders", { method: "POST" }).catch((caught: unknown) => caught)
    );

    expect(error).toMatchObject({
      code: "NETWORK_ERROR",
      isNetworkError: true,
      operation: "/api/orders"
    });
    expect(error.message).toBe(
      "The service could not be reached. Check that it is running, then try again."
    );
    expect(error.message).not.toContain("internal");
    expect(error.technicalMessage).toContain("internal");
  });

  test("turns the client timeout into a safe TIMEOUT error", async () => {
    jest.useFakeTimers();
    globalThis.fetch = mockFetch(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true
          });
        })
    );

    const pending = requestJson("/api/slow").catch((caught: unknown) => caught);
    jest.advanceTimersByTime(15_000);
    const error = expectApiError(await pending);

    expect(error).toMatchObject({ code: "TIMEOUT", isNetworkError: true });
    expect(error.message).toBe("The service took too long to respond. Try again.");
  });

  test("treats caller cancellation separately from an outage", async () => {
    const unavailable = mock(() => undefined);
    const controller = new AbortController();
    setOnApiUnavailable(unavailable);
    globalThis.fetch = mockFetch(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true
          });
        })
    );

    const pending = requestJson("/api/cancellable", { signal: controller.signal }).catch(
      (caught: unknown) => caught
    );
    controller.abort(new DOMException("Cancelled by caller", "AbortError"));
    const error = expectApiError(await pending);

    expect(error).toMatchObject({ code: "REQUEST_CANCELLED", isNetworkError: false });
    expect(unavailable).not.toHaveBeenCalled();
  });

  test("invokes the unauthorized callback only for the admin scope", async () => {
    const unauthorized = mock(() => undefined);
    setOnUnauthorized(unauthorized);
    globalThis.fetch = mockFetch(() =>
      Promise.resolve(new Response("unauthorized", { status: 401 }))
    );

    await requestJson("/api/admin/me").catch(() => undefined);
    await requestJson("/api/account/me", {}, "customer").catch(() => undefined);

    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  test("keeps raw database, endpoint, and token text out of Error.message", async () => {
    const technical = "SQL database failure at /api/private Authorization: Bearer secret-token";
    globalThis.fetch = mockFetch(() => Promise.resolve(new Response(technical, { status: 500 })));

    const error = expectApiError(
      await requestJson("/api/private").catch((caught: unknown) => caught)
    );

    expect(error.message).toBe("The service could not complete the request. Try again later.");
    expect(error.message).not.toContain("secret-token");
    expect(error.technicalMessage).toBe(technical);
  });

  test("preserves structured code, safe field errors, and request ID", async () => {
    globalThis.fetch = mockFetch(() =>
      Promise.resolve(
        Response.json(
          {
            code: "VALIDATION_ERROR",
            message: "database rejected submitted record",
            fieldErrors: {
              email: "Enter a valid email.",
              password: "token leaked by validator"
            },
            requestId: "req-42"
          },
          { status: 422 }
        )
      )
    );

    const error = expectApiError(
      await requestJson("/api/users", { method: "POST" }).catch((caught: unknown) => caught)
    );

    expect(error).toMatchObject({ code: "VALIDATION_ERROR", requestId: "req-42", status: 422 });
    expect(error.fieldErrors).toEqual([
      { field: "email", message: "Enter a valid email." },
      { field: "password", message: "Review this field." }
    ]);
    expect(error.message).not.toContain("database");
  });

  test("returns fallback data and retains compatibility callbacks for unavailable reads", async () => {
    const unavailable = mock(() => undefined);
    setOnApiUnavailable(unavailable);
    globalThis.fetch = mockFetch(() => Promise.reject(new TypeError("offline")));
    const fallback = [{ id: "fallback" }];

    const result = await fetchJsonResult("/api/catalog", fallback);

    expect(result).toEqual({ data: fallback, isFallback: true });
    expect(unavailable).toHaveBeenCalledTimes(1);
  });
});
