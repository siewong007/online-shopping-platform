import { requestJson, setCustomerAuthToken } from "../../../shared/api/http";
import type {
  CustomerAuthPayload,
  CustomerLoginInput,
  CustomerMePayload,
  CustomerRegisterInput,
  CustomerSession
} from "../types";

export async function register(input: CustomerRegisterInput): Promise<CustomerAuthPayload> {
  const payload = await requestJson<CustomerAuthPayload>(
    "/api/account/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    },
    "customer"
  );

  setCustomerAuthToken(payload.token);
  return payload;
}

export async function login(input: CustomerLoginInput): Promise<CustomerAuthPayload> {
  const payload = await requestJson<CustomerAuthPayload>(
    "/api/account/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    },
    "customer"
  );

  setCustomerAuthToken(payload.token);
  return payload;
}

export async function logout(): Promise<void> {
  try {
    await requestJson<void>("/api/account/logout", { method: "POST" }, "customer");
  } finally {
    setCustomerAuthToken(null);
  }
}

export function fetchMe(): Promise<CustomerMePayload> {
  return requestJson<CustomerMePayload>("/api/account/me", {}, "customer");
}

export function fetchSessions(): Promise<CustomerSession[]> {
  return requestJson<CustomerSession[]>("/api/account/sessions", {}, "customer");
}

export function logoutSession(sessionId: number): Promise<void> {
  return requestJson<void>(`/api/account/sessions/${sessionId}`, { method: "DELETE" }, "customer");
}

export function logoutOtherSessions(): Promise<void> {
  return requestJson<void>("/api/account/sessions/others", { method: "DELETE" }, "customer");
}
