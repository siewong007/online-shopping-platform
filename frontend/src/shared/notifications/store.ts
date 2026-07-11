import { SEVERITY_CONFIG } from "./config";
import type { AppNotification, NotificationInput, NotificationScope } from "./types";

export type NotificationSnapshot = Readonly<{
  visible: readonly AppNotification[];
  queued: readonly AppNotification[];
}>;

export type NotificationScheduler = {
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export type NotificationStoreOptions = {
  maxVisible?: number;
  idFactory?: () => string;
  now?: () => number;
  scheduler?: NotificationScheduler;
};

export type NotificationStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => NotificationSnapshot;
  add: (input: NotificationInput) => string;
  update: (id: string, patch: Partial<NotificationInput>) => void;
  remove: (id: string) => void;
  clearScope: (scope: NotificationScope) => void;
  clearAll: () => void;
  retry: (id: string) => Promise<void>;
  destroy: () => void;
};

const defaultScheduler: NotificationScheduler = {
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
};

/** Creates an isolated notification store suitable for React's useSyncExternalStore. */
export function createNotificationStore(options: NotificationStoreOptions = {}): NotificationStore {
  const maxVisible = Math.max(1, options.maxVisible ?? 5);
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? (() => `notification-${now()}-${Math.random().toString(36).slice(2, 8)}`);
  const scheduler = options.scheduler ?? defaultScheduler;
  const listeners = new Set<() => void>();
  const timers = new Map<string, unknown>();
  const retrying = new Map<string, Promise<void>>();
  let visible: AppNotification[] = [];
  let queued: AppNotification[] = [];
  let snapshot: NotificationSnapshot = Object.freeze({ visible: Object.freeze([]), queued: Object.freeze([]) });
  let destroyed = false;

  const publish = () => {
    snapshot = Object.freeze({ visible: Object.freeze([...visible]), queued: Object.freeze([...queued]) });
    for (const listener of listeners) listener();
  };

  const cancelTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer !== undefined) scheduler.clearTimeout(timer);
    timers.delete(id);
  };

  const schedule = (notification: AppNotification) => {
    cancelTimer(notification.id);
    if (notification.duration === null || notification.persistent || !visible.some(({ id }) => id === notification.id)) return;
    timers.set(notification.id, scheduler.setTimeout(() => remove(notification.id), notification.duration));
  };

  const promote = () => {
    while (visible.length < maxVisible && queued.length) {
      const next = queued.shift();
      if (next) {
        visible.push(next);
        schedule(next);
      }
    }
  };

  const remove = (id: string) => {
    if (destroyed) return;
    cancelTimer(id);
    visible = visible.filter((item) => item.id !== id);
    queued = queued.filter((item) => item.id !== id);
    promote();
    publish();
  };

  const add = (input: NotificationInput): string => {
    if (destroyed) return "";
    const existing = input.dedupeKey
      ? [...visible, ...queued].find((item) => item.dedupeKey === input.dedupeKey && item.scope === (input.scope ?? "global"))
      : undefined;
    if (existing) {
      const severityChanged = input.severity !== existing.severity;
      const defaultDuration = SEVERITY_CONFIG[input.severity].defaultDuration;
      const persistent = severityChanged
        ? input.persistent ?? (input.duration === null || defaultDuration === null)
        : input.persistent ?? existing.persistent;
      const duration = persistent
        ? null
        : (input.duration ?? (severityChanged ? defaultDuration : existing.duration));
      const updated = {
        ...existing,
        ...input,
        id: existing.id,
        duration,
        persistent,
        timestamp: now(),
        occurrenceCount: existing.occurrenceCount + 1
      };
      visible = visible.map((item) => item.id === existing.id ? updated : item);
      queued = queued.map((item) => item.id === existing.id ? updated : item);
      schedule(updated);
      publish();
      return existing.id;
    }
    const defaultDuration = SEVERITY_CONFIG[input.severity].defaultDuration;
    const persistent = input.persistent ?? (input.duration === null || defaultDuration === null);
    const notification: AppNotification = {
      ...input,
      id: input.id ?? idFactory(),
      presentation: input.presentation ?? "toast",
      scope: input.scope ?? "global",
      dismissible: input.dismissible ?? true,
      duration: persistent ? null : (input.duration ?? defaultDuration),
      persistent,
      timestamp: input.timestamp ?? now(),
      occurrenceCount: 1
    };
    if (visible.length < maxVisible) {
      visible.push(notification);
      schedule(notification);
    } else queued.push(notification);
    publish();
    return notification.id;
  };

  const update = (id: string, patch: Partial<NotificationInput>) => {
    if (destroyed) return;
    const apply = (item: AppNotification): AppNotification => {
      if (item.id !== id) return item;
      const duration = patch.persistent === true ? null : patch.duration ?? item.duration;
      return { ...item, ...patch, id: item.id, duration, persistent: patch.persistent ?? (duration === null) };
    };
    visible = visible.map(apply);
    queued = queued.map(apply);
    const item = visible.find((candidate) => candidate.id === id);
    if (item) schedule(item);
    publish();
  };

  const retry = (id: string): Promise<void> => {
    if (destroyed) return Promise.resolve();
    const active = retrying.get(id);
    if (active) return active;
    const item = [...visible, ...queued].find((candidate) => candidate.id === id);
    if (!item?.retry) return Promise.resolve();
    update(id, { retrying: true });
    const attempt = Promise.resolve().then(item.retry.run).finally(() => {
      retrying.delete(id);
      if (!destroyed) update(id, { retrying: false });
    });
    retrying.set(id, attempt);
    return attempt;
  };

  const clearMatching = (predicate: (item: AppNotification) => boolean) => {
    if (destroyed) return;
    for (const item of [...visible, ...queued]) if (predicate(item)) cancelTimer(item.id);
    visible = visible.filter((item) => !predicate(item));
    queued = queued.filter((item) => !predicate(item));
    promote();
    publish();
  };

  return {
    subscribe(listener) {
      if (destroyed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    add,
    update,
    remove,
    clearScope: (scope) => clearMatching((item) => item.scope === scope),
    clearAll: () => clearMatching(() => true),
    retry,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const timer of timers.values()) scheduler.clearTimeout(timer);
      timers.clear();
      retrying.clear();
      listeners.clear();
      visible = [];
      queued = [];
      snapshot = Object.freeze({ visible: Object.freeze([]), queued: Object.freeze([]) });
    }
  };
}
