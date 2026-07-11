import { afterEach, describe, expect, test } from "bun:test";
import { SEVERITY_CONFIG } from "../../src/shared/notifications/config";
import { configureErrorReporter, normalizeError, reportError } from "../../src/shared/notifications/errors";

afterEach(() => configureErrorReporter());

describe("severity configuration", () => {
  test("defines accessible behavior and durations for every severity", () => {
    expect(Object.keys(SEVERITY_CONFIG)).toEqual(["info", "success", "warning", "error", "critical"]);
    expect(SEVERITY_CONFIG.info).toMatchObject({ role: "status", defaultDuration: 6_000 });
    expect(SEVERITY_CONFIG.success).toMatchObject({ role: "status", defaultDuration: 5_000 });
    expect(SEVERITY_CONFIG.warning).toMatchObject({ role: "alert", defaultDuration: 9_000 });
    expect(SEVERITY_CONFIG.error).toMatchObject({ role: "alert", defaultDuration: null });
    expect(SEVERITY_CONFIG.critical).toMatchObject({ role: "alert", defaultDuration: null });
    for (const config of Object.values(SEVERITY_CONFIG)) expect(config.accessibleLabel.length).toBeGreaterThan(0);
  });
});

describe("normalizeError", () => {
  test.each([
    [400, "BAD_REQUEST"], [401, "UNAUTHORIZED"], [403, "FORBIDDEN"], [404, "NOT_FOUND"],
    [409, "CONFLICT"], [422, "VALIDATION_ERROR"], [429, "RATE_LIMITED"], [503, "SERVER_ERROR"]
  ])("maps status %i", (status, code) => {
    expect(normalizeError({ status, message: "internal database stack" }).code).toBe(code);
  });

  test("maps known business and file codes", () => {
    expect(normalizeError({ code: "out_of_stock" }).code).toBe("OUT_OF_STOCK");
    expect(normalizeError({ errorCode: "file_too_large" }).code).toBe("FILE_TOO_LARGE");
  });

  test("handles auth expiry, network failures, and timeouts", () => {
    expect(normalizeError({ status: 401 }).userTitle).toBe("Session expired");
    expect(normalizeError({ isNetworkError: true }).code).toBe("NETWORK_ERROR");
    expect(normalizeError({ name: "AbortError" }).code).toBe("TIMEOUT");
    expect(normalizeError(new Error("request timeout")).code).toBe("TIMEOUT");
  });

  test("keeps validation fields without exposing submitted values", () => {
    const normalized = normalizeError({ status: 422, errors: { email: "invalid", quantity: ["too low"] } });
    expect(normalized.fieldErrors).toEqual([{ field: "email", message: "invalid" }, { field: "quantity", message: undefined }]);
    expect(normalized.userMessage).not.toContain("invalid");
  });

  test("uses safe copy and a reference for unknown and sensitive errors", () => {
    const secret = "Bearer abc123 Authorization cookie=secret https://private.example/api stack SQL SELECT";
    const normalized = normalizeError(new Error(secret), { operation: "/api/private?token=abc" });
    expect(normalized.code).toBe("UNKNOWN_ERROR");
    expect(normalized.referenceId).toMatch(/^ERR-[A-Z0-9]+-[A-Z0-9]{6}$/);
    expect(`${normalized.userTitle} ${normalized.userMessage}`).not.toContain("abc123");
    expect(`${normalized.userTitle} ${normalized.userMessage}`).not.toContain("private.example");
    expect(normalized.technicalDetails).toBeDefined();
  });
});

describe("reportError", () => {
  test("redacts sensitive production diagnostics before invoking the reporter", () => {
    let reported: unknown;
    let reportedContext: unknown;
    configureErrorReporter((error, context) => {
      reported = error;
      reportedContext = context;
    });

    const original = new Error("database query failed at https://service.invalid/private with Bearer example-secret");
    const normalized = reportError(original, {
      operation: "/api/private?token=example-secret",
      metadata: {
        authorization: "Bearer example-secret",
        cookie: "session=example-secret",
        password: "example-secret",
        note: "safe diagnostic label"
      }
    });
    const serialized = JSON.stringify({ reported, reportedContext });

    expect(serialized).not.toContain("example-secret");
    expect(serialized).not.toContain("service.invalid");
    expect(serialized).not.toContain("/api/private");
    expect(serialized).not.toMatch(/database query/i);
    expect(serialized).toContain("safe diagnostic label");
    expect(normalized.technicalDetails).toMatchObject({ error: original });
  });
});
