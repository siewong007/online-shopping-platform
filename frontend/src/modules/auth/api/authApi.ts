import { requestJson, setAuthToken } from "../../../shared/api/http";
import type { AdminAuthPayload, AdminLoginInput, AdminMePayload } from "../types";

export async function login(input: AdminLoginInput): Promise<AdminAuthPayload> {
  const payload = await requestJson<AdminAuthPayload>("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  setAuthToken(payload.token);
  return payload;
}

export async function logout(): Promise<void> {
  try {
    await requestJson<void>("/api/admin/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

export function fetchMe(): Promise<AdminMePayload> {
  return requestJson<AdminMePayload>("/api/admin/me");
}
