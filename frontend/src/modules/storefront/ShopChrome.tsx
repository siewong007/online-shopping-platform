import { LangToggle, useI18n } from "../../i18n/LanguageContext";
import type { Category, StorefrontPayload } from "../../types";

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
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onSubmitSearch: () => void;
  searchTerm: string;
  selectedCategory: string;
};

export function ShopHeader({
  cartCount,
  categories,
  onChangeCategory,
  onChangeSearch,
  onOpenAccount,
  onOpenCart,
  onSubmitSearch,
  searchTerm,
  selectedCategory
}: ShopHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <header className="site-header worklist-header">
        <a className="worklist-logo" href="/" aria-label={t("shop.nav.home")}>
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
            id="storefront-search"
            type="search"
            placeholder={t("shop.search.placeholder")}
            value={searchTerm}
            onChange={(event) => onChangeSearch(event.target.value)}
          />
          <button type="submit">{t("shop.search.action")}</button>
        </form>

        <div className="header-actions worklist-utils">
          <LangToggle />
          <button className="shop-header-account" onClick={onOpenAccount} type="button">
            {t("shop.account.short")}
          </button>
          <button className="shop-header-cart" onClick={onOpenCart} type="button">
            {t("shop.cart")}
            <span className="shop-header-cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="dept-chip-bar" aria-label={t("shop.filters.department")}>
        <div className="dept-chip-list">
          {categories.map((category) => (
            <button
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
  onOpenCategory,
  storefront
}: {
  onOpenCategory: (slug: string) => void;
  storefront: StorefrontPayload;
}) {
  const { t } = useI18n();

  return (
    <footer className="shop-footer">
      <div className="shop-footer-grid">
        <div className="shop-footer-brand">
          <div className="fbrand">
            <EkowayMark compact />
            <strong>{t("shop.brand")}</strong>
          </div>
          <p>{t("shop.footer.about")}</p>
        </div>
        <div>
          <h4>{t("shop.footer.shop")}</h4>
          <ul>
            {storefront.categories
              .filter((category) => category.slug !== "all")
              .slice(0, 6)
              .map((category) => (
                <li key={category.slug}>
                  <a
                    href="/shop"
                    onClick={(event) => {
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
        <div>
          <h4>{t("shop.footer.services")}</h4>
          <ul>
            {storefront.services.map((service) => (
              <li key={service.name}>{service.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t("shop.footer.contact")}</h4>
          <ul>
            <li>
              <a href="https://wa.me/60174056993" target="_blank" rel="noopener">
                WhatsApp 017-405 6993
              </a>
            </li>
            <li>{t("shop.footer.hours")}</li>
            <li>
              <a href="/contact">{t("shop.footer.link.contact")}</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>{t("shop.footer.legal")}</h4>
          <ul>
            <li>
              <a href="/privacy">{t("shop.footer.link.privacy")}</a>
            </li>
            <li>
              <a href="/terms">{t("shop.footer.link.terms")}</a>
            </li>
            <li>
              <a href="/returns">{t("shop.footer.link.returns")}</a>
            </li>
            <li>
              <a href="/delivery">{t("shop.footer.link.delivery")}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="shop-footer-copy">{t("shop.footer.copy")}</div>
    </footer>
  );
}
