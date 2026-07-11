import { describe, expect, test } from "bun:test";
import { createNotificationStore, type NotificationScheduler } from "../../src/shared/notifications/store";
import type { NotificationInput } from "../../src/shared/notifications/types";

function input(title: string, extra: Partial<NotificationInput> = {}): NotificationInput {
  return { severity: "info", title, message: `${title} message`, ...extra };
}

function harness(maxVisible = 5) {
  let sequence = 0;
  let timerSequence = 0;
  const timers = new Map<number, () => void>();
  const scheduler: NotificationScheduler = {
    setTimeout(callback) { const id = ++timerSequence; timers.set(id, callback); return id; },
    clearTimeout(handle) { timers.delete(handle as number); }
  };
  const store = createNotificationStore({ maxVisible, idFactory: () => `id-${++sequence}`, now: () => sequence, scheduler });
  return { store, timers, runTimers: () => { for (const callback of [...timers.values()]) callback(); } };
}

describe("notification store", () => {
  test("adds, updates, dismisses, and publishes", () => {
    const { store } = harness();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const id = store.add(input("Saved", { severity: "success" }));
    store.update(id, { title: "Updated" });
    expect(store.getSnapshot().visible[0]?.title).toBe("Updated");
    store.remove(id);
    expect(store.getSnapshot().visible).toHaveLength(0);
    expect(calls).toBe(3);
    unsubscribe();
  });

  test("auto-dismisses temporary notifications but keeps errors persistent", () => {
    const { store, runTimers } = harness();
    store.add(input("Temporary"));
    const errorId = store.add(input("Failure", { severity: "error" }));
    runTimers();
    expect(store.getSnapshot().visible.map(({ id }) => id)).toEqual([errorId]);
    expect(store.getSnapshot().visible[0]).toMatchObject({ persistent: true, duration: null });
  });

  test("limits visible items and promotes its FIFO queue", () => {
    const { store } = harness(2);
    const ids = ["One", "Two", "Three", "Four"].map((title) => store.add(input(title, { persistent: true })));
    expect(store.getSnapshot().visible.map(({ id }) => id)).toEqual(ids.slice(0, 2));
    expect(store.getSnapshot().queued.map(({ id }) => id)).toEqual(ids.slice(2));
    store.remove(ids[0]!);
    expect(store.getSnapshot().visible.map(({ id }) => id)).toEqual([ids[1], ids[2]]);
  });

  test("deduplicates matching notifications within a scope", () => {
    const { store } = harness();
    const first = store.add(input("First", { dedupeKey: "save", scope: "orders" }));
    const second = store.add(input("Again", { dedupeKey: "save", scope: "orders" }));
    expect(second).toBe(first);
    expect(store.getSnapshot().visible).toHaveLength(1);
    expect(store.getSnapshot().visible[0]).toMatchObject({ title: "Again", occurrenceCount: 2 });
  });

  test("recomputes persistence when a deduplicated notification changes severity", () => {
    const { store } = harness();
    const id = store.add(input("Started", { dedupeKey: "operation" }));

    expect(store.getSnapshot().visible[0]).toMatchObject({ persistent: false, duration: 6_000 });
    expect(store.add(input("Failed", { dedupeKey: "operation", severity: "error" }))).toBe(id);
    expect(store.getSnapshot().visible[0]).toMatchObject({
      severity: "error",
      persistent: true,
      duration: null,
      occurrenceCount: 2
    });
  });

  test("clears one scope independently", () => {
    const { store } = harness();
    store.add(input("Order", { scope: "orders" }));
    store.add(input("Global"));
    store.clearScope("orders");
    expect(store.getSnapshot().visible.map(({ title }) => title)).toEqual(["Global"]);
    store.clearAll();
    expect(store.getSnapshot().visible).toHaveLength(0);
  });

  test("protects retries from concurrent execution", async () => {
    const { store } = harness();
    let runs = 0;
    let resolve!: () => void;
    const work = new Promise<void>((done) => { resolve = done; });
    const id = store.add(input("Retry", { retry: { run: () => { runs++; return work; } } }));
    const first = store.retry(id);
    const second = store.retry(id);
    await Promise.resolve();
    expect(runs).toBe(1);
    expect(first).toBe(second);
    expect(store.getSnapshot().visible[0]?.retrying).toBe(true);
    resolve();
    await first;
    expect(store.getSnapshot().visible[0]?.retrying).toBe(false);
  });

  test("keeps a failed retry visible and resets its single-flight state", async () => {
    const { store } = harness();
    const failure = new Error("retry failed");
    const id = store.add(input("Retry", { retry: { run: () => Promise.reject(failure) } }));
    const first = store.retry(id);
    const second = store.retry(id);

    expect(first).toBe(second);
    await expect(first).rejects.toBe(failure);
    expect(store.getSnapshot().visible[0]).toMatchObject({ id, retrying: false });
  });

  test("ignores timer and retry completions after destroy", async () => {
    const { store, runTimers } = harness();
    let notifications = 0;
    store.subscribe(() => notifications++);
    let resolve!: () => void;
    const id = store.add(input("Retry", { retry: { run: () => new Promise<void>((done) => { resolve = done; }) } }));
    const attempt = store.retry(id);
    await Promise.resolve();
    store.destroy();
    const before = notifications;
    runTimers();
    resolve();
    await attempt;
    store.add(input("Ignored"));
    expect(notifications).toBe(before);
    expect(store.getSnapshot().visible).toHaveLength(0);
  });
});
