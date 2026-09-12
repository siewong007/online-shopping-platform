import { useCallback, useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileController = {
  ref: (element: HTMLDivElement | null) => void;
  token: string | null;
  isConfigured: boolean;
  reset: () => void;
};

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Binds a Turnstile widget to whatever div `ref` is attached to. Using a callback ref (rather
 * than useRef + deps) means the widget is (re)created exactly when the slot mounts — forms
 * that render it conditionally need no extra wiring. Unconfigured site key = inert: nothing
 * renders, token stays null, and the backend's fail-open applies.
 */
export function useTurnstile(): TurnstileController {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const isConfigured = SITE_KEY.length > 0;

  useEffect(() => {
    if (!isConfigured || !container) return;

    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: SITE_KEY,
          callback: (nextToken: unknown) =>
            setToken(typeof nextToken === "string" ? nextToken : null),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null)
        });
      })
      .catch(() => setToken(null));

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      setToken(null);
      if (widgetId !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // The widget may already be gone if the script removed it.
        }
      }
    };
  }, [container, isConfigured]);

  const reset = useCallback(() => {
    setToken(null);
    const widgetId = widgetIdRef.current;
    if (widgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch {
        // Widget was removed; a fresh mount will issue a new token.
      }
    }
  }, []);

  return { ref: setContainer, token, isConfigured, reset };
}

/** Mount point for the widget; renders nothing when Turnstile isn't configured. */
export function TurnstileSlot({ turnstile }: { turnstile: TurnstileController }) {
  if (!turnstile.isConfigured) return null;
  return <div ref={turnstile.ref} />;
}
