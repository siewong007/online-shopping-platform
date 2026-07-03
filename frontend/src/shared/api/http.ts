const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "depot_admin_token";

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

let authToken = readStoredToken();
let onUnauthorized: (() => void) | null = null;
let onApiUnavailable: (() => void) | null = null;

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function requestHeaders(includeJson: boolean, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);

  if (includeJson && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
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

export function setOnUnauthorized(callback: (() => void) | null): void {
  onUnauthorized = callback;
}

export function setOnApiUnavailable(callback: (() => void) | null): void {
  onApiUnavailable = callback;
}

export async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: requestHeaders(false)
    });

    if (response.status === 401) {
      onUnauthorized?.();
      throw new ApiError(`Request failed for ${path}`, { status: response.status });
    }

    if (!response.ok) {
      throw new ApiError(`Request failed for ${path}`, { status: response.status });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      onApiUnavailable?.();
    }

    console.warn("Using fallback data because the API is unavailable.", error);
    return fallback;
  }
}

export async function requestJson<TResponse>(
  path: string,
  init: RequestInit = {}
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders(false, init.headers)
    });
  } catch (error) {
    onApiUnavailable?.();
    console.warn("Unable to reach the API for a write request.", error);
    throw new ApiError("This request is temporarily unavailable. Please try again in a moment.", {
      isNetworkError: true
    });
  }

  if (response.status === 401) {
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

export async function postJson<TBody, TResponse>(
  path: string,
  body: TBody
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(body)
  });
}

export async function putJson<TBody, TResponse>(
  path: string,
  body: TBody
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(body)
  });
}

export async function deleteJson(path: string): Promise<void> {
  return requestJson<void>(path, {
    method: "DELETE",
    headers: requestHeaders(false)
  });
}
