import { requestJson, setAuthToken, turnstileHeaders } from "../../../shared/api/http";
import type {
  AdminAuthPayload,
  AdminLoginInput,
  AdminLoginResponse,
  AdminMePayload,
  AdminMfaEnrollmentStart,
  AdminMfaRecoveryCodes,
} from "../types";

function hasToken(payload: AdminLoginResponse): payload is AdminAuthPayload {
  return "token" in payload;
}

export async function login(
  input: AdminLoginInput,
  turnstileToken?: string | null
): Promise<AdminLoginResponse> {
  const payload = await requestJson<AdminLoginResponse>("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...turnstileHeaders(turnstileToken) },
    body: JSON.stringify(input)
  });

  if (hasToken(payload)) {
    setAuthToken(payload.token);
  }
  return payload;
}

/// Second step of an MFA login; the server issues the session only after the code verifies.
export async function verifyLogin(input: {
  challenge_token: string;
  code?: string;
  recovery_code?: string;
}): Promise<AdminAuthPayload> {
  const payload = await requestJson<AdminAuthPayload>("/api/admin/login/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  setAuthToken(payload.token);
  return payload;
}

export function requestMfaStatus(): Promise<{ enabled: boolean }> {
  return requestJson<{ enabled: boolean }>("/api/admin/mfa/status");
}

export function startMfaEnrollment(): Promise<AdminMfaEnrollmentStart> {
  return requestJson<AdminMfaEnrollmentStart>("/api/admin/mfa/enrollment", { method: "POST" });
}

export function confirmMfaEnrollment(code: string): Promise<AdminMfaRecoveryCodes> {
  return requestJson<AdminMfaRecoveryCodes>("/api/admin/mfa/enrollment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
}

export function disableMfa(password: string, code: string): Promise<void> {
  return requestJson<void>("/api/admin/mfa/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, code })
  });
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
