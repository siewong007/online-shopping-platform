import type { ActivityItem, AuditEvent } from "../types";
import { formatRelativeTime } from "../shared/formatters";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const ACCOUNT_EMAIL_STORAGE_KEY = "depot-account-email";

export function readStoredAccountEmail(): string {
  try {
    return window.localStorage.getItem(ACCOUNT_EMAIL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberAccountEmail(email: string) {
  try {
    window.localStorage.setItem(ACCOUNT_EMAIL_STORAGE_KEY, email);
  } catch {
    return;
  }
}

export function appendUniqueByKey<T>(
  current: T[],
  next: T[],
  keyFor: (item: T) => number | string
): T[] {
  const seen = new Set(current.map(keyFor));
  const merged = [...current];

  for (const item of next) {
    const key = keyFor(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export function fulfillmentLabel(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function auditEventToActivityItem(event: AuditEvent): ActivityItem {
  const action = fulfillmentLabel(event.action).toLowerCase();
  const entity = fulfillmentLabel(event.entity_type).toLowerCase();
  const summary = `${event.actor} ${action} ${entity}`.trim();

  return {
    happened_at: formatRelativeTime(event.happened_at),
    detail: event.detail ? `${summary} — ${event.detail}` : summary
  };
}
