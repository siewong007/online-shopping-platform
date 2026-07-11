import type { NotificationSeverity } from "./types";

export type SeverityConfig = Readonly<{
  iconLabel: string;
  accessibleLabel: string;
  role: "status" | "alert";
  defaultDuration: number | null;
}>;

export const SEVERITY_CONFIG: Readonly<Record<NotificationSeverity, SeverityConfig>> = Object.freeze({
  info: Object.freeze({ iconLabel: "i", accessibleLabel: "Information", role: "status", defaultDuration: 6_000 }),
  success: Object.freeze({ iconLabel: "check", accessibleLabel: "Success", role: "status", defaultDuration: 5_000 }),
  warning: Object.freeze({ iconLabel: "!", accessibleLabel: "Warning", role: "alert", defaultDuration: 9_000 }),
  error: Object.freeze({ iconLabel: "x", accessibleLabel: "Error", role: "alert", defaultDuration: null }),
  critical: Object.freeze({ iconLabel: "!!", accessibleLabel: "Critical error", role: "alert", defaultDuration: null })
});
