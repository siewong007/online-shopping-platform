import { useEffect, useRef, type MouseEvent } from "react";

import { LangToggle, useI18n } from "../../i18n/LanguageContext";
import type { Category, StorefrontPayload } from "../../types";
import type { LegalSlug } from "../legal/content";

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function EkowayMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ekoway-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <img src="/ekoway/ekoway-logo.jpeg" alt="" />
    </div>
  );
}

export type ShopHeaderProps = {
  cartCount: number;
  categories: Category[];
  onChangeCategory: (slug: string) => void;
  onChangeSearch: (value: string) => void;
  onNavigateHome?: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onPreloadAccount?: () => void;
  onPreloadCart?: () => void;
  onSubmitSearch: () => void;
  searchTerm: string;
  selectedCategory: string;
};

export function ShopHeader({
  cartCount,
  categories,
  onChangeCategory,
  onChangeSearch,
  onNavigateHome,
  onOpenAccount,
  onOpenCart,
  onPreloadAccount,
  onPreloadCart,
  onSubmitSearch,
  searchTerm,
  selectedCategory
}: ShopHeaderProps) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const suppressShortcutSlashUntilRef = useRef(0);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (
        searchInputRef.current?.closest("[inert]") ||
        document.querySelector('[aria-modal="true"], [role="dialog"]:not([aria-hidden="true"])')
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      suppressShortcutSlashUntilRef.current = Date.now() + 120;
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  return (
    <>
      <header className="site-header worklist-header">
        <a
          className="worklist-logo"
          href="/"
          aria-label={t("shop.nav.home")}
          onClick={(event) => {
            if (!onNavigateHome || !isPlainLeftClick(event)) return;
            event.preventDefault();
            onNavigateHome();
          }}
        >
          <EkowayMark />
          <span className="worklist-logo__word">EKOWAY</span>
          <i aria-hidden="true" />
          <span className="worklist-logo__sub">HARDWARE</span>
        </a>

        <form
          className="search-shell worklist-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitSearch();
          }}
        >
          <label className="sr-only" htmlFor="storefront-search">
            {t("shop.search.label")}
          </label>
          <input
            ref={searchInputRef}
            id="storefront-search"
            type="search"
            placeholder={t("shop.search.placeholder")}
            value={searchTerm}
            onChange={(event) => {
              if (
                Date.now() < suppressShortcutSlashUntilRef.current &&
                (event.target.value === "/" || event.target.value === `${searchTerm}/`)
              ) {
                suppressShortcutSlashUntilRef.current = 0;
                return;
              }
              suppressShortcutSlashUntilRef.current = 0;
              onChangeSearch(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (searchTerm) {
                  event.preventDefault();
                  onChangeSearch("");
                } else {
                  event.currentTarget.blur();
                }
              }
            }}
          />
          <button type="submit">{t("shop.search.action")}</button>
        </form>

        <div className="header-actions worklist-utils">
          <LangToggle />
          <button
            className="shop-header-account"
            onClick={onOpenAccount}
            onFocus={onPreloadAccount}
            onMouseEnter={onPreloadAccount}
            type="button"
          >
            {t("shop.account.short")}
          </button>
          <button
            className="shop-header-cart"
            onClick={onOpenCart}
            onFocus={onPreloadCart}
            onMouseEnter={onPreloadCart}
            type="button"
          >
            {t("shop.cart")}
            <span className="shop-header-cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="dept-chip-bar" aria-label={t("shop.filters.department")}>
        <div className="dept-chip-list">
          {categories.map((category) => (
            <button
              aria-current={selectedCategory === category.slug ? "page" : undefined}
              aria-pressed={selectedCategory === category.slug}
              key={category.slug}
              className={"dept-chip" + (selectedCategory === category.slug ? " dept-chip--on" : "")}
              onClick={() => onChangeCategory(category.slug)}
              type="button"
            >
              {category.slug === "all" ? t("shop.dept.all.short") : category.name}
            </button>
          ))}
        </div>
        <a className="dept-whatsapp" href="https://wa.me/60174056993" target="_blank" rel="noopener">
          <i aria-hidden="true" />
          {t("shop.whatsapp")}
        </a>
      </nav>
    </>
  );
}

export function ShopFooter({
  onNavigateHome,
  onOpenCategory,
  onOpenLegal,
  storefront
}: {
  onNavigateHome?: () => void;
  onOpenCategory: (slug: string) => void;
  onOpenLegal?: (slug: LegalSlug) => void;
  storefront: StorefrontPayload;
}) {
  const { t } = useI18n();

  const renderLegalLink = (slug: LegalSlug, label: string) => (
    <a
      href={`/${slug}`}
      onClick={(event) => {
        if (!onOpenLegal || !isPlainLeftClick(event)) return;
        event.preventDefault();
        onOpenLegal(slug);
      }}
    >
      {label}
    </a>
  );

  return (
    <footer className="shop-footer">
      <div className="shop-footer-grid">
        <div className="shop-footer-brand">
          <a
            className="fbrand"
            href="/"
            onClick={(event) => {
              if (!onNavigateHome || !isPlainLeftClick(event)) return;
              event.preventDefault();
              onNavigateHome();
            }}
          >
            <EkowayMark compact />
            <strong>{t("shop.brand")}</strong>
          </a>
          <p>{t("shop.footer.about")}</p>
        </div>
        <div>
          <h4>{t("shop.footer.shop")}</h4>
          <ul>
            {(storefront.categories.some((category) => category.slug !== "all")
              ? storefront.categories.filter((category) => category.slug !== "all")
              : storefront.categories
            )
              .slice(0, 6)
              .map((category) => (
                <li key={category.slug}>
                  <a
                    href="/shop"
                    onClick={(event) => {
                      if (!isPlainLeftClick(event)) return;
                      event.preventDefault();
                      onOpenCategory(category.slug);
                    }}
                  >
                    {category.name}
                  </a>
                </li>
              ))}
          </ul>
        </div>
        {storefront.services.length > 0 ? (
          <div>
            <h4>{t("shop.footer.services")}</h4>
            <ul>
              {storefront.services.map((service) => (
                <li key={service.name}>{service.name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <h4>{t("shop.footer.contact")}</h4>
          <ul>
            <li>
              <a href="https://wa.me/60174056993" target="_blank" rel="noopener">
                WhatsApp 017-405 6993
              </a>
            </li>
            <li>{t("shop.footer.hours")}</li>
            <li>{renderLegalLink("contact", t("shop.footer.link.contact"))}</li>
          </ul>
        </div>
        <div>
          <h4>{t("shop.footer.legal")}</h4>
          <ul>
            <li>{renderLegalLink("privacy", t("shop.footer.link.privacy"))}</li>
            <li>{renderLegalLink("terms", t("shop.footer.link.terms"))}</li>
            <li>{renderLegalLink("returns", t("shop.footer.link.returns"))}</li>
            <li>{renderLegalLink("delivery", t("shop.footer.link.delivery"))}</li>
          </ul>
        </div>
      </div>
      <div className="shop-footer-copy">{t("shop.footer.copy")}</div>
    </footer>
  );
}

/** Zero-dependency architectural chrome for Policy and Status pages before storefront data loads. */
export function PublicSiteChrome({
  activeLegalSlug,
  onHome,
  onOpenLegal,
  onPrefetchShop,
  onShop,
  children
}: {
  activeLegalSlug?: LegalSlug;
  onHome: () => void;
  onOpenLegal?: (slug: LegalSlug) => void;
  onPrefetchShop?: () => void;
  onShop: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  const legalLinks: { slug: LegalSlug; label: string }[] = [
    { slug: "privacy", label: t("shop.footer.link.privacy") },
    { slug: "terms", label: t("shop.footer.link.terms") },
    { slug: "returns", label: t("shop.footer.link.returns") },
    { slug: "delivery", label: t("shop.footer.link.delivery") },
    { slug: "contact", label: t("shop.footer.link.contact") }
  ];

  return (
    <div className="public-site-shell">
      <header className="public-header">
        <a
          className="public-logo"
          href="/"
          aria-label={t("shop.nav.home")}
          onClick={(event) => {
            if (!isPlainLeftClick(event)) return;
            event.preventDefault();
            onHome();
          }}
        >
          <EkowayMark />
          <span className="public-logo__word">EKOWAY</span>
          <i aria-hidden="true" />
          <span className="public-logo__sub">HARDWARE</span>
        </a>

        <div className="public-header__utils">
          <LangToggle />
          <a
            className="public-header__shop"
            href="/shop"
            onClick={(event) => {
              if (!isPlainLeftClick(event)) return;
              event.preventDefault();
              onShop();
            }}
            onFocus={onPrefetchShop}
            onMouseEnter={onPrefetchShop}
          >
            {t("nav.shop")} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      {children}

      <footer className="public-footer">
        <div className="public-footer__inner">
          <div className="public-footer__meta">
            <strong>{t("shop.brand")}</strong>
            <span>{t("shop.footer.copy")}</span>
          </div>
          <nav className="public-footer__links" aria-label={t("legal.navLabel")}>
            {legalLinks.map((item) => (
              <a
                key={item.slug}
                aria-current={activeLegalSlug === item.slug ? "page" : undefined}
                href={`/${item.slug}`}
                onClick={(event) => {
                  if (!onOpenLegal || !isPlainLeftClick(event)) return;
                  event.preventDefault();
                  onOpenLegal(item.slug);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
