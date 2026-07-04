import { fallbackAuditEvents } from "../../../data/fallback";
import { fetchJson } from "../../../shared/api/http";
import type { AuditEvent } from "../types";

export const AUDIT_EVENTS_PAGE_SIZE = 50;

export function fetchAuditEvents(before?: number): Promise<AuditEvent[]> {
  const params = new URLSearchParams({ limit: String(AUDIT_EVENTS_PAGE_SIZE) });
  if (before !== undefined) {
    params.set("before", String(before));
  }

  return fetchJson(
    `/api/admin/audit-events?${params.toString()}`,
    before === undefined ? fallbackAuditEvents : []
  );
}
