import { normalizeError } from "../notifications/errors";
import type { ValidationFieldError } from "../notifications/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "depot_admin_token";
const CUSTOMER_TOKEN_STORAGE_KEY = "depot_customer_token";
const SUPPORT_TOKEN_STORAGE_KEY = "depot_support_token";
const REQUEST_TIMEOUT_MS = 15_000;

export type AuthScope = "admin" | "customer" | "support" | "public";

type ApiErrorOptions = {
  code?: string;
  fieldErrors?: ValidationFieldError[];
  isNetworkError?: boolean;
  operation?: string;
  requestId?: string;
  status?: number;
  technicalMessage?: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly fieldErrors?: ValidationFieldError[];
  readonly isNetworkError: boolean;
  readonly operation?: string;
  readonly requestId?: string;
  readonly status?: number;
  readonly technicalMessage?: string;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.fieldErrors = options.fieldErrors;
    this.isNetworkError = options.isNetworkError ?? false;
    this.operation = options.operation;
    this.requestId = options.requestId;
    this.status = options.status;
    this.technicalMessage = options.technicalMessage;
  }
}

type ErrorPayload = {
  code?: string;
  fieldErrors?: unknown;
  message?: string;
  requestId?: string;
};

type TimedSignal = {
  didCancel: () => boolean;
  didTimeout: () => boolean;
  dispose: () => void;
  signal: AbortSignal;
};

let authToken = readStoredToken(AUTH_TOKEN_STORAGE_KEY);
let customerAuthToken = readStoredToken(CUSTOMER_TOKEN_STORAGE_KEY);
let supportAuthToken = readStoredToken(SUPPORT_TOKEN_STORAGE_KEY);
let onUnauthorized: (() => void) | null = null;
let onApiUnavailable: (() => void) | null = null;

function readStoredToken(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function requestHeaders(includeJson: boolean, extra?: HeadersInit, scope: AuthScope = "admin"): Headers {
  const headers = new Headers(extra);

  if (includeJson && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token =
    scope === "admin"
      ? authToken
      : scope === "customer"
        ? customerAuthToken
        : scope === "support"
          ? supportAuthToken
          : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function createTimedSignal(inputSignal?: AbortSignal | null): TimedSignal {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromInput = () => controller.abort(inputSignal?.reason);
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, REQUEST_TIMEOUT_MS);

  if (inputSignal?.aborted) {
    abortFromInput();
  } else {
    inputSignal?.addEventListener("abort", abortFromInput, { once: true });
  }

  return {
    signal: controller.signal,
    didCancel: () => inputSignal?.aborted === true,
    didTimeout: () => timedOut,
    dispose: () => {
      globalThis.clearTimeout(timeout);
      inputSignal?.removeEventListener("abort", abortFromInput);
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (typeof record?.[key] === "string") return record[key] as string;
  }
  return undefined;
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? undefined;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("json")) {
    try {
      const body = asRecord(await response.json());
      return {
        code: readString(body, "code", "errorCode"),
        message: readString(body, "message"),
        fieldErrors: body?.fieldErrors ?? body?.errors,
        requestId: readString(body, "requestId", "request_id", "correlationId", "correlation_id") ?? requestId
      };
    } catch {
      return { requestId };
    }
  }

  try {
    return { message: (await response.text()) || undefined, requestId };
  } catch {
    return { requestId };
  }
}

function safeApiError(options: ApiErrorOptions & { cause?: unknown }): ApiError {
  const normalized = normalizeError(
    {
      code: options.code,
      fieldErrors: options.fieldErrors,
      isNetworkError: options.isNetworkError,
      message: options.technicalMessage,
      name: options.code === "TIMEOUT" ? "AbortError" : undefined,
      status: options.status
    },
    { code: options.code, operation: options.operation }
  );

  const error = new ApiError(normalized.userMessage, {
    ...options,
    code: normalized.code,
    fieldErrors: normalized.fieldErrors
  });
  if (options.cause !== undefined) error.cause = options.cause;
  return error;
}

async function errorFromResponse(response: Response, path: string): Promise<ApiError> {
  const payload = await readErrorPayload(response);
  const normalized = normalizeError(
    { code: payload.code, errors: payload.fieldErrors, message: payload.message, status: response.status },
    { operation: path }
  );

  return new ApiError(normalized.userMessage, {
    code: normalized.code,
    fieldErrors: normalized.fieldErrors,
    operation: path,
    requestId: payload.requestId,
    status: response.status,
    technicalMessage: payload.message
  });
}

async function performFetch(path: string, init: RequestInit, scope: AuthScope): Promise<Response> {
  const timedSignal = createTimedSignal(init.signal);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders(false, init.headers, scope),
      signal: timedSignal.signal
    });
  } catch (cause) {
    if (timedSignal.didTimeout()) {
      throw safeApiError({
        cause,
        code: "TIMEOUT",
        isNetworkError: true,
        operation: path,
        technicalMessage: cause instanceof Error ? cause.message : undefined
      });
    }
    if (timedSignal.didCancel()) {
      throw safeApiError({
        cause,
        code: "REQUEST_CANCELLED",
        isNetworkError: false,
        operation: path,
        technicalMessage: cause instanceof Error ? cause.message : undefined
      });
    }
    if (cause instanceof ApiError) throw cause;
    throw safeApiError({
      cause,
      code: "NETWORK_ERROR",
      isNetworkError: true,
      operation: path,
      technicalMessage: cause instanceof Error ? cause.message : undefined
    });
  } finally {
    timedSignal.dispose();
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null): void {
  authToken = token;

  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    authToken = token;
  }
}

export function getCustomerAuthToken(): string | null {
  return customerAuthToken;
}

export function setCustomerAuthToken(token: string | null): void {
  customerAuthToken = token;

  try {
    if (token) {
      window.localStorage.setItem(CUSTOMER_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(CUSTOMER_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — in-memory token above still applies.
  }
}

export function getSupportAuthToken(): string | null {
  return supportAuthToken;
}

export function setSupportAuthToken(token: string | null): void {
  supportAuthToken = token;

  try {
    if (token) {
      window.localStorage.setItem(SUPPORT_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(SUPPORT_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — in-memory token above still applies.
  }
}

export function setOnUnauthorized(callback: (() => void) | null): void {
  onUnauthorized = callback;
}

export function setOnApiUnavailable(callback: (() => void) | null): void {
  onApiUnavailable = callback;
}

export async function fetchJson<T>(path: string, fallback: T, scope: AuthScope = "admin"): Promise<T> {
  const { data } = await fetchJsonResult(path, fallback, scope);
  return data;
}

export async function fetchJsonResult<T>(
  path: string,
  fallback: T,
  scope: AuthScope = "admin"
): Promise<{ data: T; isFallback: boolean }> {
  try {
    const response = await performFetch(path, {}, scope);

    if (response.status === 401 && scope === "admin") onUnauthorized?.();
    if (!response.ok) throw await errorFromResponse(response, path);

    return { data: (await response.json()) as T, isFallback: false };
  } catch (error) {
    if (!(error instanceof ApiError) || error.isNetworkError) onApiUnavailable?.();
    return { data: fallback, isFallback: true };
  }
}

export async function requestJson<TResponse>(
  path: string,
  init: RequestInit = {},
  scope: AuthScope = "admin"
): Promise<TResponse> {
  let response: Response;

  try {
    response = await performFetch(path, init, scope);
  } catch (error) {
    if (!(error instanceof ApiError) || error.isNetworkError) onApiUnavailable?.();
    throw error;
  }

  if (response.status === 401 && scope === "admin") onUnauthorized?.();
  if (!response.ok) throw await errorFromResponse(response, path);
  if (response.status === 204) return undefined as TResponse;
  return (await response.json()) as TResponse;
}

export async function requestBlob(
  path: string,
  init: RequestInit = {},
  scope: AuthScope = "admin"
): Promise<Blob> {
  let response: Response;

  try {
    response = await performFetch(path, init, scope);
  } catch (error) {
    onApiUnavailable?.();
    throw error;
  }

  if (response.status === 401 && scope === "admin") onUnauthorized?.();
  if (!response.ok) throw await errorFromResponse(response, path);
  return response.blob();
}

export async function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
  scope: AuthScope = "admin"
): Promise<TResponse> {
  return requestJson<TResponse>(
    path,
    {
      method: "POST",
      headers: requestHeaders(true, undefined, scope),
      body: JSON.stringify(body)
    },
    scope
  );
}

export async function postBlob<TBody>(
  path: string,
  body: TBody,
  scope: AuthScope = "admin"
): Promise<Blob> {
  return requestBlob(
    path,
    {
      method: "POST",
      headers: requestHeaders(true, undefined, scope),
      body: JSON.stringify(body)
    },
    scope
  );
}

export async function putJson<TBody, TResponse>(
  path: string,
  body: TBody,
  scope: AuthScope = "admin"
): Promise<TResponse> {
  return requestJson<TResponse>(
    path,
    {
      method: "PUT",
      headers: requestHeaders(true, undefined, scope),
      body: JSON.stringify(body)
    },
    scope
  );
}

export async function deleteJson(path: string, scope: AuthScope = "admin"): Promise<void> {
  return requestJson<void>(
    path,
    {
      method: "DELETE",
      headers: requestHeaders(false, undefined, scope)
    },
    scope
  );
}
