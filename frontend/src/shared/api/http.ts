const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const ADMIN_ROLE_HEADER = "X-Admin-Role-Id";

function jsonHeaders(adminRoleId?: number): Record<string, string> {
  return adminRoleId
    ? { "Content-Type": "application/json", [ADMIN_ROLE_HEADER]: String(adminRoleId) }
    : { "Content-Type": "application/json" };
}

export async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn("Using fallback data because the API is unavailable.", error);
    return fallback;
  }
}

async function requestJson<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (error) {
    console.warn("Unable to reach the API for a write request.", error);
    throw new Error("This request is temporarily unavailable. Please try again in a moment.");
  }

  if (!response.ok) {
    const message = (await response.text()) || `Request failed for ${path}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
  adminRoleId?: number
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: jsonHeaders(adminRoleId),
    body: JSON.stringify(body)
  });
}

export async function putJson<TBody, TResponse>(
  path: string,
  body: TBody,
  adminRoleId?: number
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PUT",
    headers: jsonHeaders(adminRoleId),
    body: JSON.stringify(body)
  });
}

export async function deleteJson(path: string, adminRoleId?: number): Promise<void> {
  return requestJson<void>(path, {
    method: "DELETE",
    headers: adminRoleId ? { [ADMIN_ROLE_HEADER]: String(adminRoleId) } : undefined
  });
}
