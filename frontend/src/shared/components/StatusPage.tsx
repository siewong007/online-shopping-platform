import { useI18n } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import type { LegalSlug } from "../../modules/legal/content";
import { PublicSiteChrome } from "../../modules/storefront/ShopChrome";

type StatusPageProps = {
  code: "403" | "404";
  onGoHome: () => void;
  onOpenLegal?: (slug: LegalSlug) => void;
  onPrefetchShop?: () => void;
  onShop: () => void;
};

const KEYS_BY_CODE: Record<
  "403" | "404",
  { eyebrow: TranslationKey; title: TranslationKey; message: TranslationKey }
> = {
  "403": {
    eyebrow: "status.403.eyebrow",
    title: "status.403.title",
    message: "status.403.message"
  },
  "404": {
    eyebrow: "status.404.eyebrow",
    title: "status.404.title",
    message: "status.404.message"
  }
};

/** Full-page recovery for an unavailable or inaccessible application route. */
export function StatusPage({
  code,
  onGoHome,
  onOpenLegal,
  onPrefetchShop,
  onShop
}: StatusPageProps) {
  const { t } = useI18n();
  const keys = KEYS_BY_CODE[code];

  return (
    <PublicSiteChrome
      onHome={onGoHome}
      onOpenLegal={onOpenLegal}
      onPrefetchShop={onPrefetchShop}
      onShop={onShop}
    >
      <main className="status-page" aria-labelledby="status-page-title">
        <section className="status-page__card">
          <p className="status-page__code" aria-hidden="true">
            {code}
          </p>
          <p className="eyebrow">{t(keys.eyebrow)}</p>
          <h1 id="status-page-title">{t(keys.title)}</h1>
          <p className="status-page__message">{t(keys.message)}</p>
          <div className="status-page__actions">
            <button className="solid-button" onClick={onGoHome} type="button">
              {t("status.goHome")}
            </button>
            <button className="outline-button" onClick={onShop} type="button">
              {t("status.browseStore")}
            </button>
          </div>
        </section>
      </main>
    </PublicSiteChrome>
  );
}
