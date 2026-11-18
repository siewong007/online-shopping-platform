import { mock } from "bun:test";

/** Wraps a Bun mock handler with `preconnect` so `globalThis.fetch` satisfies strict `typeof fetch`. */
export function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
): typeof fetch {
  return Object.assign(mock(handler), {
    preconnect: () => {}
  });
}
