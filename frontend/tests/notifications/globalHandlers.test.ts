import { describe, expect, test } from "bun:test";
import { registerGlobalNotificationHandlers } from "../../src/shared/notifications/globalHandlers";
import { createNotificationStore } from "../../src/shared/notifications/store";
import type { NotificationInput } from "../../src/shared/notifications/types";

function runtimeHarness() {
  let sequence = 0;
  const store = createNotificationStore({ idFactory: () => `id-${++sequence}` });
  const reported: Array<{ error: unknown; options: Record<string, unknown> | undefined }> = [];
  const api = {
    notify: (input: NotificationInput) => store.add(input),
    notifyError(error: unknown, options?: Record<string, unknown>) {
      reported.push({ error, options });
      return store.add({
        severity: "critical",
        title: "Application error",
        message: "The application could not continue. Reload and try again.",
        presentation: "banner",
        persistent: true,
        dedupeKey: options?.dedupeKey as string | undefined
      });
    },
    dismiss: (id: string) => store.remove(id)
  };
  return { api, reported, store };
}

describe("global notification handlers", () => {
  test("deduplicates offline state, removes it on reconnect, and shows success", () => {
    const target = new EventTarget();
    const { api, store } = runtimeHarness();
    const cleanup = registerGlobalNotificationHandlers(api, { target, isOnline: () => true });

    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("offline"));
    expect(store.getSnapshot().visible).toHaveLength(1);
    expect(store.getSnapshot().visible[0]).toMatchObject({
      severity: "warning",
      presentation: "banner",
      dedupeKey: "connectivity-offline",
      occurrenceCount: 2
    });

    target.dispatchEvent(new Event("online"));
    expect(store.getSnapshot().visible).toHaveLength(1);
    expect(store.getSnapshot().visible[0]).toMatchObject({ severity: "success", title: "Connection restored" });
    cleanup();
    store.destroy();
  });

  test("reports runtime errors and promise rejections as one persistent critical condition", () => {
    const target = new EventTarget();
    const { api, reported, store } = runtimeHarness();
    const cleanup = registerGlobalNotificationHandlers(api, { target, isOnline: () => true });
    const errorEvent = Object.assign(new Event("error"), { error: new Error("render failed") });
    const rejectionEvent = Object.assign(new Event("unhandledrejection"), { reason: new Error("async failed") });

    target.dispatchEvent(errorEvent);
    target.dispatchEvent(rejectionEvent);
    expect(reported).toHaveLength(2);
    expect(reported[0]?.options).toMatchObject({
      presentation: "banner",
      persistent: true,
      dedupeKey: "unexpected-runtime-failure"
    });
    expect(store.getSnapshot().visible).toHaveLength(1);
    expect(store.getSnapshot().visible[0]).toMatchObject({ severity: "critical", occurrenceCount: 2 });
    cleanup();
    store.destroy();
  });

  test("handles slow connections and removes every listener during cleanup", () => {
    const target = new EventTarget();
    const connection = Object.assign(new EventTarget(), { effectiveType: "2g" });
    const { api, reported, store } = runtimeHarness();
    const cleanup = registerGlobalNotificationHandlers(api, { target, connection, isOnline: () => true });
    expect(store.getSnapshot().visible[0]).toMatchObject({ title: "Slow connection", persistent: true });

    cleanup();
    store.clearAll();
    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("error"));
    connection.dispatchEvent(new Event("change"));
    expect(store.getSnapshot().visible).toHaveLength(0);
    expect(reported).toHaveLength(0);
    store.destroy();
  });

  test("cleanup dismisses owned notices before a StrictMode-like re-registration", () => {
    const target = new EventTarget();
    const connection = Object.assign(new EventTarget(), { effectiveType: "2g" });
    const { api, store } = runtimeHarness();

    const firstCleanup = registerGlobalNotificationHandlers(api, {
      target,
      connection,
      isOnline: () => false
    });
    expect(store.getSnapshot().visible).toHaveLength(2);
    firstCleanup();
    expect(store.getSnapshot().visible).toHaveLength(0);

    const secondCleanup = registerGlobalNotificationHandlers(api, {
      target,
      connection,
      isOnline: () => false
    });
    expect(store.getSnapshot().visible).toHaveLength(2);
    expect(store.getSnapshot().visible.every(({ occurrenceCount }) => occurrenceCount === 1)).toBe(true);
    secondCleanup();
    store.destroy();
  });
});
