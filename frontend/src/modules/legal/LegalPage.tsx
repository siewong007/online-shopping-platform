import { type MouseEvent, useEffect } from "react";

import { useI18n } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { PublicSiteChrome } from "../storefront/ShopChrome";
import { LEGAL_DOCUMENTS, type LegalSlug } from "./content";

type LegalPageProps = {
  onBack: () => void;
  onHome: () => void;
  onOpenLegal?: (slug: LegalSlug) => void;
  slug: LegalSlug;
};

const LEGAL_SLUGS: { slug: LegalSlug; labelKey: TranslationKey }[] = [
  { slug: "privacy", labelKey: "shop.footer.link.privacy" },
  { slug: "terms", labelKey: "shop.footer.link.terms" },
  { slug: "returns", labelKey: "shop.footer.link.returns" },
  { slug: "delivery", labelKey: "shop.footer.link.delivery" },
  { slug: "contact", labelKey: "shop.footer.link.contact" }
];

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/** Static policy page. Content lives in ./content.ts so the prose is editable in one place. */
export function LegalPage({ onBack, onHome, onOpenLegal, slug }: LegalPageProps) {
  const { t } = useI18n();
  const document = LEGAL_DOCUMENTS[slug];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <PublicSiteChrome
      activeLegalSlug={slug}
      onHome={onHome}
      onOpenLegal={onOpenLegal}
      onShop={onBack}
    >
      <main className="legal-page" aria-labelledby="legal-page-title">
        <nav className="legal-nav" aria-label={t("legal.navLabel")}>
          {LEGAL_SLUGS.map((item) => (
            <a
              key={item.slug}
              aria-current={item.slug === slug ? "page" : undefined}
              href={`/${item.slug}`}
              onClick={(event) => {
                if (!onOpenLegal || !isPlainLeftClick(event)) return;
                event.preventDefault();
                onOpenLegal(item.slug);
              }}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>

        <article className="legal-page__inner">
          <p className="eyebrow">{t("shop.brand")}</p>
          <h1 id="legal-page-title">{document.title}</h1>
          <p className="legal-page__updated">
            {t("legal.lastUpdated", { date: document.updated })}
          </p>
          <p className="legal-page__intro">{document.intro}</p>

          {document.sections.map((section) => (
            <section className="legal-page__section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="legal-page__actions">
            <button className="solid-button" onClick={onBack} type="button">
              {t("legal.backToStore")}
            </button>
            <button className="outline-button" onClick={onHome} type="button">
              {t("legal.goHome")}
            </button>
          </div>
        </article>
      </main>
    </PublicSiteChrome>
  );
}
