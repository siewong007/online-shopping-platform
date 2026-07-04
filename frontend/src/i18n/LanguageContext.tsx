import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { translations } from "./translations";
import type { Lang, TranslationKey } from "./translations";

const LANG_STORAGE_KEY = "ekoway-lang";

function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "bm" || stored === "zh" ? stored : "en";
  } catch {
    return "en";
  }
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
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  }, [lang]);

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
          text = text.replace(`{${name}}`, String(value));
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
  const { lang, setLang } = useI18n();
  const options: { code: Lang; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "bm", label: "BM" },
    { code: "zh", label: "中文" }
  ];

  return (
    <div className={className} role="group" aria-label="Language">
      {options.map((option, index) => (
        <span key={option.code} style={{ display: "contents" }}>
          {index > 0 ? (
            <span className="sep" aria-hidden="true">
              /
            </span>
          ) : null}
          <button
            type="button"
            data-lang={option.code}
            className={lang === option.code ? "on" : ""}
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
