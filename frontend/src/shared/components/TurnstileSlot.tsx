import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/LanguageContext";

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
  mountSlot: (element: HTMLDivElement | null) => void;
  token: string | null;
  isConfigured: boolean;
  hasError: boolean;
  reset: () => void;
};

let scriptPromise: Promise<void> | null = null;

const TURNSTILE_LOAD_TIMEOUT_MS = 10000;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;

    const cleanup = () => {
      window.clearTimeout(timerId);
      script.onload = null;
      script.onerror = null;
    };

    const timerId = window.setTimeout(() => {
      cleanup();
      script.remove();
      scriptPromise = null;
      reject(new Error("Turnstile script timed out"));
    }, TURNSTILE_LOAD_TIMEOUT_MS);

    script.onload = () => {
      cleanup();
      resolve();
    };
    script.onerror = () => {
      cleanup();
      script.remove();
      scriptPromise = null;
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Binds a Turnstile widget to whatever div `mountSlot` is attached to. Using a callback ref
 * means the widget is (re)created-and-cleaned-up exactly when the slot mounts — forms that
 * render it conditionally need no extra wiring. Unconfigured site key = inert: nothing renders,
 * token stays null, and the backend's fail-open applies.
 */
export function useTurnstile(): TurnstileController {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isConfigured = SITE_KEY.length > 0;

  const mountSlot = useCallback((element: HTMLDivElement | null) => {
    setContainer(element);
    if (!element) {
      setHasError(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured || !container) return;

    let cancelled = false;
    let loadListenerAttached = false;

    const mountWidget = () => {
      if (cancelled) return;
      loadTurnstile()
        .then(() => {
          if (cancelled || !window.turnstile || widgetIdRef.current !== null) return;
          widgetIdRef.current = window.turnstile.render(container, {
            sitekey: SITE_KEY,
            theme: "light",
            callback: (nextToken: unknown) => {
              setHasError(false);
              setToken(typeof nextToken === "string" ? nextToken : null);
            },
            "expired-callback": () => setToken(null),
            "error-callback": () => {
              setToken(null);
              setHasError(true);
            }
          });
        })
        .catch(() => {
          if (!cancelled) {
            setToken(null);
            setHasError(true);
          }
        });
    };

    if (document.readyState === "complete") {
      mountWidget();
    } else {
      // Wait for window `load` so a slow/blocked challenge script never stalls initial route navigation.
      loadListenerAttached = true;
      window.addEventListener("load", mountWidget, { once: true });
    }

    return () => {
      cancelled = true;
      if (loadListenerAttached) {
        window.removeEventListener("load", mountWidget);
      }
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
  }, [container, isConfigured, retryCount]);

  const reset = useCallback(() => {
    setToken(null);
    setHasError(false);
    const widgetId = widgetIdRef.current;
    if (widgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
        return;
      } catch {
        // Widget was removed; remount below.
      }
    }
    setRetryCount((count) => count + 1);
  }, []);

  return { mountSlot, token, isConfigured, hasError, reset };
}

/** Mount point for the widget; renders nothing when Turnstile isn't configured. */
export function TurnstileSlot({
  turnstile: { hasError, isConfigured, mountSlot, reset }
}: {
  turnstile: TurnstileController;
}) {
  const { t } = useI18n();
  if (!isConfigured) return null;
  return (
    <div className="turnstile-slot">
      <div ref={mountSlot} />
      {hasError ? (
        <div className="turnstile-slot__error" role="alert">
          <span>{t("turnstile.error")}</span>
          <button className="text-link" onClick={reset} type="button">
            {t("turnstile.retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
