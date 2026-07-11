import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { reportError } from "./errors";
import { registerGlobalNotificationHandlers, type GlobalHandlerOptions } from "./globalHandlers";
import { NotificationBox } from "./NotificationBox";
import { createNotificationStore, type NotificationStore } from "./store";
import type {
  NotificationAction,
  NotificationInput,
  NotificationPresentation,
  NotificationRetry,
  NotificationScope,
  NotificationSeverity
} from "./types";

export type NotificationErrorOptions = {
  operation?: string;
  metadata?: Readonly<Record<string, unknown>>;
  action?: NotificationAction;
  retry?: NotificationRetry;
  severity?: NotificationSeverity;
  presentation?: NotificationPresentation;
  scope?: NotificationScope;
  dedupeKey?: string;
  persistent?: boolean;
  dismissible?: boolean;
};

export type NotificationsApi = {
  notify: (input: NotificationInput) => string;
  notifyError: (error: unknown, options?: NotificationErrorOptions) => string;
  dismiss: (id: string) => void;
  clearScope: (scope: NotificationScope) => void;
  clearAll: () => void;
};

export type NotificationProviderProps = {
  children: ReactNode;
  enableGlobalHandlers?: boolean;
  globalHandlerOptions?: GlobalHandlerOptions;
};

const NotificationsContext = createContext<NotificationsApi | undefined>(undefined);

function createApi(store: NotificationStore): NotificationsApi {
  return {
    notify: (input) => store.add(input),
    notifyError(error, options = {}) {
      const normalized = reportError(error, {
        operation: options.operation,
        scope: options.scope,
        metadata: options.metadata
      });
      const severity = options.severity ?? normalized.severity;
      return store.add({
        severity,
        title: normalized.userTitle,
        message: normalized.userMessage,
        code: normalized.code,
        referenceId: normalized.referenceId,
        action: options.action,
        retry: normalized.retryable ? options.retry : undefined,
        presentation: options.presentation ?? (severity === "critical" ? "banner" : "toast"),
        scope: options.scope ?? "global",
        dedupeKey: options.dedupeKey ?? `${normalized.code ?? "UNKNOWN_ERROR"}:${options.operation ?? "unknown"}`,
        persistent: options.persistent,
        dismissible: options.dismissible
      });
    },
    dismiss: (id) => store.remove(id),
    clearScope: (scope) => store.clearScope(scope),
    clearAll: () => store.clearAll()
  };
}

export function NotificationProvider({ children, enableGlobalHandlers = true, globalHandlerOptions }: NotificationProviderProps) {
  const storeRef = useRef<NotificationStore | null>(null);
  const lifecycleGeneration = useRef(0);
  if (!storeRef.current) storeRef.current = createNotificationStore();
  const store = storeRef.current;
  const api = useMemo(() => createApi(store), [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    if (!enableGlobalHandlers) return undefined;
    return registerGlobalNotificationHandlers(api, globalHandlerOptions);
  }, [api, enableGlobalHandlers, globalHandlerOptions]);

  useEffect(() => {
    const generation = ++lifecycleGeneration.current;
    return () => queueMicrotask(() => {
      // StrictMode immediately starts a new effect generation; only a real unmount destroys the store.
      if (lifecycleGeneration.current === generation) store.destroy();
    });
  }, [store]);

  const toasts = snapshot.visible.filter((item) => item.presentation === "toast");
  const notices = snapshot.visible.filter((item) => item.presentation !== "toast");

  return (
    <NotificationsContext.Provider value={api}>
      {children}
      {notices.length ? (
        <div aria-label="Application notifications" className="notification-region notification-region--persistent">
          {notices.map((item) => <NotificationBox key={item.id} notification={item} onDismiss={store.remove} onRetry={store.retry} />)}
        </div>
      ) : null}
      <div aria-label="Notifications" aria-live="polite" className="notification-region notification-region--toasts">
        {toasts.map((item) => <NotificationBox key={item.id} notification={item} onDismiss={store.remove} onRetry={store.retry} />)}
      </div>
    </NotificationsContext.Provider>
  );
}

/** Accesses the application notification manager. Must be used inside NotificationProvider. */
export function useNotifications(): NotificationsApi {
  const api = useContext(NotificationsContext);
  if (!api) throw new Error("useNotifications must be used inside NotificationProvider");
  return api;
}
