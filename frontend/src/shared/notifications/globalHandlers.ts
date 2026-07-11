import type { NotificationInput, NotificationRetry, NotificationSeverity } from "./types";

export type RuntimeErrorOptions = Pick<NotificationInput, "presentation" | "scope" | "dedupeKey" | "persistent" | "dismissible"> & {
  retry?: NotificationRetry;
  severity?: NotificationSeverity;
};

export type GlobalHandlerNotificationApi = {
  notify: (input: NotificationInput) => string;
  notifyError: (error: unknown, options?: RuntimeErrorOptions) => string;
  dismiss: (id: string) => void;
};

export type NetworkInformationLike = EventTarget & {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
};

export type GlobalHandlerOptions = {
  target?: EventTarget;
  connection?: NetworkInformationLike;
  isOnline?: () => boolean;
};

type RuntimeErrorEvent = Event & { error?: unknown; message?: string };
type PromiseRejectionEventLike = Event & { reason?: unknown };

function isSlowConnection(connection: NetworkInformationLike): boolean {
  return connection.saveData === true
    || connection.effectiveType === "slow-2g"
    || connection.effectiveType === "2g"
    || (typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < 0.5);
}

/** Registers browser-wide failure and connectivity coverage through testable EventTarget seams. */
export function registerGlobalNotificationHandlers(
  api: GlobalHandlerNotificationApi,
  options: GlobalHandlerOptions = {}
): () => void {
  const target = options.target ?? (typeof window === "undefined" ? undefined : window);
  if (!target) return () => undefined;

  const connection = options.connection ?? (typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { connection?: NetworkInformationLike }).connection);
  const isOnline = options.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine !== false);
  let offlineId: string | undefined;
  let slowId: string | undefined;

  const showOffline = () => {
    offlineId = api.notify({
      severity: "warning",
      title: "You are offline",
      message: "Your connection was lost. Changes may not be saved until you reconnect.",
      presentation: "banner",
      scope: "global",
      persistent: true,
      duration: null,
      dedupeKey: "connectivity-offline"
    });
  };

  const showOnline = () => {
    if (offlineId) api.dismiss(offlineId);
    offlineId = undefined;
    api.notify({
      severity: "success",
      title: "Connection restored",
      message: "You are back online. Pending changes can now be synchronized.",
      presentation: "toast",
      scope: "global",
      dedupeKey: "connectivity-restored"
    });
  };

  const showSlowConnection = () => {
    if (connection && isSlowConnection(connection)) {
      slowId = api.notify({
        severity: "warning",
        title: "Slow connection",
        message: "Some actions may take longer than usual. Keep this page open while they finish.",
        presentation: "banner",
        scope: "global",
        persistent: true,
        duration: null,
        dedupeKey: "connectivity-slow"
      });
    } else if (slowId) {
      api.dismiss(slowId);
      slowId = undefined;
    }
  };

  const reportRuntimeError = (event: Event) => {
    const runtimeEvent = event as RuntimeErrorEvent;
    api.notifyError(runtimeEvent.error ?? new Error(runtimeEvent.message || "Unexpected runtime failure"), {
      severity: "critical",
      presentation: "banner",
      scope: "global",
      persistent: true,
      dismissible: true,
      dedupeKey: "unexpected-runtime-failure"
    });
  };

  const reportUnhandledRejection = (event: Event) => {
    const rejectionEvent = event as PromiseRejectionEventLike;
    api.notifyError(rejectionEvent.reason ?? new Error("Unhandled promise rejection"), {
      severity: "critical",
      presentation: "banner",
      scope: "global",
      persistent: true,
      dismissible: true,
      dedupeKey: "unexpected-runtime-failure"
    });
  };

  target.addEventListener("error", reportRuntimeError);
  target.addEventListener("unhandledrejection", reportUnhandledRejection);
  target.addEventListener("offline", showOffline);
  target.addEventListener("online", showOnline);
  connection?.addEventListener("change", showSlowConnection);

  if (!isOnline()) showOffline();
  showSlowConnection();

  return () => {
    target.removeEventListener("error", reportRuntimeError);
    target.removeEventListener("unhandledrejection", reportUnhandledRejection);
    target.removeEventListener("offline", showOffline);
    target.removeEventListener("online", showOnline);
    connection?.removeEventListener("change", showSlowConnection);
    if (offlineId) api.dismiss(offlineId);
    if (slowId) api.dismiss(slowId);
    offlineId = undefined;
    slowId = undefined;
  };
}
