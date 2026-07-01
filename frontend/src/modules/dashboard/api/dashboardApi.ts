import { fallbackAdminDashboard } from "../../../data/fallback";
import { fetchJson } from "../../../shared/api/http";
import type { AdminDashboardPayload } from "../types";

export function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  return fetchJson("/api/admin/dashboard", fallbackAdminDashboard);
}
