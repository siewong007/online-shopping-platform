const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "depot_admin_token";
const CUSTOMER_TOKEN_STORAGE_KEY = "depot_customer_token";

export type AuthScope = "admin" | "customer";

type ApiErrorOptions = {
  isNetworkError?: boolean;
  status?: number;
};

export class ApiError extends Error {
  isNetworkError: boolean;
  status?: number;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.isNetworkError = options.isNetworkError ?? false;
    this.status = options.status;
  }
}

let authToken = readStoredToken(AUTH_TOKEN_STORAGE_KEY);
let customerAuthToken = readStoredToken(CUSTOMER_TOKEN_STORAGE_KEY);
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

  const token = scope === "customer" ? customerAuthToken : authToken;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
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
    const response = await fetch(`${API_URL}${path}`, {
      headers: requestHeaders(false, undefined, scope)
    });

    if (response.status === 401 && scope === "admin") {
      onUnauthorized?.();
      throw new ApiError(`Request failed for ${path}`, { status: response.status });
    }

    if (!response.ok) {
      throw new ApiError(`Request failed for ${path}`, { status: response.status });
    }

    return { data: (await response.json()) as T, isFallback: false };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      onApiUnavailable?.();
    }

    console.warn("Using fallback data because the API is unavailable.", error);
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
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders(false, init.headers, scope)
    });
  } catch (error) {
    onApiUnavailable?.();
    console.warn("Unable to reach the API for a write request.", error);
    throw new ApiError("This request is temporarily unavailable. Please try again in a moment.", {
      isNetworkError: true
    });
  }

  if (response.status === 401 && scope === "admin") {
    onUnauthorized?.();
  }

  if (!response.ok) {
    const message = (await response.text()) || `Request failed for ${path}`;
    throw new ApiError(message, { status: response.status });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function requestBlob(
  path: string,
  init: RequestInit = {},
  scope: AuthScope = "admin"
): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders(false, init.headers, scope)
    });
  } catch (error) {
    onApiUnavailable?.();
    console.warn("Unable to reach the API for a download request.", error);
    throw new ApiError("This download is temporarily unavailable. Please try again in a moment.", {
      isNetworkError: true
    });
  }

  if (response.status === 401 && scope === "admin") {
    onUnauthorized?.();
  }

  if (!response.ok) {
    const message = (await response.text()) || `Request failed for ${path}`;
    throw new ApiError(message, { status: response.status });
  }

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
