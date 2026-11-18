import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { translations } from "./translations";
import type { Lang, TranslationKey } from "./translations";

const LANG_STORAGE_KEY = "ekoway-lang";

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
  for (const raw of candidates) {
    const code = (raw ?? "").toLowerCase();
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("ms")) return "bm";
    if (code.startsWith("en")) return "en";
  }
  return "en";
}

function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "bm" || stored === "zh") return stored;
    return detectBrowserLang();
  } catch {
    return "en";
  }
}

export function htmlLangFor(lang: Lang): string {
  return lang === "bm" ? "ms" : lang === "zh" ? "zh-Hans" : "en";
}

export function intlLocaleFor(lang: Lang): string {
  return lang === "bm" ? "ms-MY" : lang === "zh" ? "zh-Hans-MY" : "en-MY";
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = htmlLangFor(lang);
  }, [lang]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANG_STORAGE_KEY) return;
      if (event.newValue === "en" || event.newValue === "bm" || event.newValue === "zh") {
        setLangState(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // storage unavailable — keep the in-memory choice
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let text: string = translations[key][lang] ?? translations[key].en;
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }
  return context;
}

export function LangToggle({ className = "lang-toggle" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const options: { code: Lang; label: string; htmlLang: string; ariaLabel: string }[] = [
    { code: "en", label: "EN", htmlLang: "en", ariaLabel: "English" },
    { code: "bm", label: "BM", htmlLang: "ms", ariaLabel: "Bahasa Melayu" },
    { code: "zh", label: "中文", htmlLang: "zh-Hans", ariaLabel: "中文" }
  ];

  return (
    <div className={className} role="group" aria-label={t("nav.language")}>
      {options.map((option, index) => (
        <span key={option.code} style={{ display: "contents" }}>
          {index > 0 ? (
            <span className="sep" aria-hidden="true">
              /
            </span>
          ) : null}
          <button
            type="button"
            lang={option.htmlLang}
            data-lang={option.code}
            className={lang === option.code ? "on" : ""}
            aria-label={option.ariaLabel}
            aria-pressed={lang === option.code}
            onClick={() => setLang(option.code)}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
