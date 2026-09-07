import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "../../i18n/LanguageContext";
import { JOB_LENSES, type JobLensId } from "./jobLenses";
import type { Product, StorefrontSort } from "../../types";

import {
  askPriceHref,
  priceInputToCents,
  PURCHASE_ENABLED,
  WA_COUNTER,
  formatWorklistPrice
} from "./helpers";
import {
  EmptyResults,
  IconClose,
  JobBand,
  JobContextDisclosure,
  JobContextRail,
  ListingProductMedia,
  ListingStockLine,
  PRICE_PRESETS,
  productStockState,
  ShopListingSkeletonRows,
  type StorefrontViewProps
} from "./listing";

export function StorefrontView({
  activeJobId,
  filteredProducts,
  isLoadingMoreProducts,
  isRefetching,
  isShowingFallbackData,
  onLoadMoreProducts,
  totalProducts,
  maxPriceCents,
  minPriceCents,
  onAddToCart,
  onChangeCategory,
  onChangeMaxPrice,
  onChangeMinPrice,
  onChangeSearch,
  onChangeSort,
  onReturnFocusComplete,
  onSelectJob,
  onViewProduct,
  returnFocusProductId,
  searchTerm,
  selectedCategory,
  sortOption,
  storefront,
  inStockOnly,
  onSaleOnly,
  onChangeInStockOnly,
  onChangeOnSaleOnly
}: StorefrontViewProps) {
  const { t } = useI18n();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersToggleRef = useRef<HTMLButtonElement | null>(null);
  const productFieldRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  // Host for the filter drawer portal. It carries `storefront-shell` because every
  // drawer/backdrop rule in styles.css is scoped under that class, and `display:
  // contents` keeps the host itself out of layout.
  const filterHostRef = useRef<HTMLDivElement | null>(null);
  if (filterHostRef.current === null) {
    const host = document.createElement("div");
    host.className = "storefront-shell";
    host.style.display = "contents";
    filterHostRef.current = host;
  }

  useEffect(() => {
    const host = filterHostRef.current;
    if (!host) return;
    document.body.appendChild(host);
    return () => host.remove();
  }, []);
  const availableJobs = isShowingFallbackData
    ? []
    : JOB_LENSES.filter(
        (job) =>
          job.approvedForProduction &&
          job.departmentSlugs.some((slug) => filteredProducts.some((product) => product.category_slug === slug)),
      );
  const activeJob = activeJobId ? availableJobs.find((job) => job.id === activeJobId) ?? null : null;

  useEffect(() => {
    if (!isFiltersOpen) return;

    const sidebar = sidebarRef.current;
    const focusables = Array.from(
      sidebar?.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) ?? []
    ).filter((element) => element.offsetParent !== null);
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFiltersOpen(false);
        return;
      }

      if (event.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    // The drawer is portalled to <body>, so marking the app shell inert keeps a
    // screen reader's virtual cursor out of the page behind it — Tab alone only
    // traps the keyboard.
    const appShell = document.querySelector<HTMLElement>(".app-shell");
    appShell?.setAttribute("inert", "");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      appShell?.removeAttribute("inert");
      // Only restore focus when the toggle is still on the page; on unmount it
      // is gone and focusing it would steal focus from the next view.
      if (filtersToggleRef.current?.isConnected) {
        filtersToggleRef.current.focus();
      }
    };
  }, [isFiltersOpen]);

  useEffect(() => {
    if (returnFocusProductId === null) return;

    const timeout = window.setTimeout(() => {
      const productControl = productFieldRef.current?.querySelector<HTMLButtonElement>(
        `[data-product-focus-id="${returnFocusProductId}"]`
      );
      if (!productControl && isRefetching) return;

      (productControl ?? productFieldRef.current)?.focus();
      productControl?.scrollIntoView({ block: "center", inline: "nearest" });
      onReturnFocusComplete();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isRefetching, returnFocusProductId]);

  const jobProducts = activeJob
    ? filteredProducts.filter((product) => activeJob.departmentSlugs.includes(product.category_slug))
    : filteredProducts;
  // Filtering happens in the query now; everything returned is already a match.
  const visibleProducts = jobProducts;
  // Department counts come from the API and respect every filter except the department
  // itself, so they show where else the current search has results.
  const countBySlug = new Map(
    storefront.category_counts.map((entry) => [entry.category_slug, entry.count])
  );
  const departmentsWithStock = storefront.categories.filter(
    (category) => category.slug === "all" || (countBySlug.get(category.slug) ?? 0) > 0
  );
  const departmentCount = new Set(visibleProducts.map((product) => product.category_slug)).size;
  const activeFilterCount =
    Number(Boolean(searchTerm)) +
    Number(selectedCategory !== "all") +
    Number(minPriceCents != null || maxPriceCents != null) +
    Number(onSaleOnly) +
    Number(inStockOnly);
  const activePreset = PRICE_PRESETS.find(
    (preset) => preset.minCents === (minPriceCents ?? -1) && preset.maxCents === maxPriceCents
  );

  const clearAllFilters = () => {
    onChangeSearch("");
    onChangeCategory("all");
    onChangeMinPrice(null);
    onChangeMaxPrice(null);
    onChangeOnSaleOnly(false);
    onChangeInStockOnly(false);
  };

  return (
    <>
      {availableJobs.length > 0 ? (
        <JobBand
          activeJob={activeJob}
          departmentCount={departmentCount}
          jobs={availableJobs}
          onSelectJob={onSelectJob}
          productCount={visibleProducts.length}
        />
      ) : null}

      <main
        className={`worklist-catalogue-shell${activeJob ? "" : " worklist-catalogue-shell--all"}`}
      >
        {activeJob ? (
          <>
            <JobContextRail categories={storefront.categories} job={activeJob} products={visibleProducts} />
            <JobContextDisclosure categories={storefront.categories} job={activeJob} products={visibleProducts} />
          </>
        ) : null}

        <section
          aria-label={t("shop.products.title")}
          className="worklist-product-field"
          ref={productFieldRef}
          tabIndex={-1}
        >
          {isShowingFallbackData ? (
            <div className="shop-offline-banner worklist-offline-notice" role="status">
              <span>{t("shop.offline.banner")}</span>
              <button onClick={() => window.location.reload()} type="button">
                {t("shop.offline.reload")}
              </button>
            </div>
          ) : null}
          {!PURCHASE_ENABLED ? (
            <div className="shop-offline-banner worklist-offline-notice" role="status">
              <span>{t("shop.purchase.banner")}</span>
              <a className="outline-button" href={WA_COUNTER} rel="noopener" target="_blank">
                {t("shop.purchase.askPrice")}
              </a>
            </div>
          ) : null}
          <div className="worklist-toolbar">
            <span className="worklist-toolbar__count" aria-live="polite">
              {activeJob
                ? t("shop.jobs.resultCount", { products: totalProducts, job: activeJob.name })
                : t("shop.toolbar.results", { n: totalProducts })}
            </span>
            <div className="worklist-toolbar__controls">
              <button
                aria-expanded={isFiltersOpen}
                className="worklist-control"
                onClick={() => setIsFiltersOpen(true)}
                ref={filtersToggleRef}
                type="button"
              >
                {t("shop.filters.toggle")}
                {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
              </button>
              <label className="worklist-sort">
                <span>{t("shop.toolbar.sort")}:</span>
                <select value={sortOption} onChange={(event) => onChangeSort(event.target.value as StorefrontSort)}>
                  <option value="featured">{t("shop.sort.featured")}</option>
                  <option value="price_asc">{t("shop.sort.priceAsc")}</option>
                  <option value="price_desc">{t("shop.sort.priceDesc")}</option>
                  <option value="name">{t("shop.sort.name")}</option>
                </select>
              </label>
            </div>
          </div>

          {isFiltersOpen ? createPortal(
            <>
              <button
                aria-label={t("shop.filters.close")}
                className="worklist-filter-backdrop"
                onClick={() => setIsFiltersOpen(false)}
                type="button"
              />
              <aside className="worklist-filter-drawer" aria-label={t("shop.filters.title")} aria-modal="true" role="dialog" ref={sidebarRef}>
                <div className="worklist-filter-drawer__header">
                  <h2>{t("shop.filters.title")}</h2>
                  <button aria-label={t("shop.filters.close")} onClick={() => setIsFiltersOpen(false)} type="button">
                    <IconClose />
                  </button>
                </div>
                <fieldset className="fgroup">
                  <legend>{t("shop.filters.availability")}</legend>
                  <label className="opt">
                    <input checked={inStockOnly} onChange={(event) => onChangeInStockOnly(event.target.checked)} type="checkbox" />
                    <span>{t("shop.filters.instock")}</span>
                  </label>
                  <label className="opt">
                    <input checked={onSaleOnly} onChange={(event) => onChangeOnSaleOnly(event.target.checked)} type="checkbox" />
                    <span>{t("shop.filters.onsale")}</span>
                  </label>
                </fieldset>
                <fieldset className="fgroup">
                  <legend>{t("shop.filters.department")}</legend>
                  <div className="opts opts--scroll">
                    {departmentsWithStock.map((category) => (
                      <label className="opt" key={category.slug}>
                        <input
                          checked={selectedCategory === category.slug}
                          name="shop-department"
                          onChange={() => onChangeCategory(category.slug)}
                          type="radio"
                        />
                        <span>{category.name}</span>
                        {category.slug === "all" ? null : (
                          <span className="opt-count">{countBySlug.get(category.slug) ?? 0}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="fgroup">
                  <legend>{t("shop.filters.price")}</legend>
                  <div className="presets">
                    {PRICE_PRESETS.map((preset) => (
                      <button
                        className={"preset" + (activePreset === preset ? " preset--on" : "")}
                        key={`${preset.minCents}-${preset.maxCents}`}
                        onClick={() => {
                          if (activePreset === preset) {
                            onChangeMinPrice(null);
                            onChangeMaxPrice(null);
                          } else {
                            onChangeMinPrice(preset.minCents);
                            onChangeMaxPrice(preset.maxCents);
                          }
                        }}
                        type="button"
                      >
                        {preset.maxCents == null
                          ? t("shop.filters.priceOver", { n: formatWorklistPrice(preset.minCents) })
                          : t("shop.filters.priceUnder", { n: formatWorklistPrice(preset.maxCents) })}
                      </button>
                    ))}
                  </div>
                  <div className="price-inputs">
                    <label>
                      <span>{t("shop.filter.min")}</span>
                      <input
                        min="0"
                        onChange={(event) => onChangeMinPrice(priceInputToCents(event.target.value))}
                        placeholder="RM 0"
                        step="0.01"
                        type="number"
                        value={minPriceCents == null ? "" : minPriceCents / 100}
                      />
                    </label>
                    <label>
                      <span>{t("shop.filter.max")}</span>
                      <input
                        min="0"
                        onChange={(event) => onChangeMaxPrice(priceInputToCents(event.target.value))}
                        placeholder="Any"
                        step="0.01"
                        type="number"
                        value={maxPriceCents == null ? "" : maxPriceCents / 100}
                      />
                    </label>
                  </div>
                </fieldset>
                <button className="worklist-filter-drawer__clear" onClick={clearAllFilters} type="button">
                  {t("shop.filters.clearAll")}
                </button>
              </aside>
            </>,
            filterHostRef.current
          ) : null}

          <div className="shop-listing-region" aria-busy={isRefetching}>
            {isRefetching ? (
              <>
                <span className="sr-only" role="status">{t("shop.listing.loading")}</span>
                <ShopListingSkeletonRows count={6} />
              </>
            ) : visibleProducts.length === 0 ? (
              <EmptyResults
                hasSearch={Boolean(searchTerm)}
                onBrowseAll={clearAllFilters}
                onClearAll={clearAllFilters}
                onClearSearch={() => onChangeSearch("")}
                searchTerm={searchTerm}
              />
            ) : (
              <div className="shop-card-grid">
                {visibleProducts.map((product) => {
                  const categoryName =
                    storefront.categories.find((category) => category.slug === product.category_slug)?.name ??
                    product.category_slug;
                  const stockState = productStockState(product);

                  return (
                    <article className="shop-product-card" key={product.id}>
                      <ListingProductMedia product={product} onOpen={() => onViewProduct(product.id)} />
                      <div className="shop-product-card-body">
                        <span className="shop-product-category">{categoryName}</span>
                        <h2>
                          <button
                            aria-label={`${t("shop.product.view")}: ${product.name}`}
                            className="shop-listing-name-link"
                            data-product-focus-id={product.id}
                            onClick={() => onViewProduct(product.id)}
                            type="button"
                          >
                            {product.name}
                          </button>
                        </h2>
                        <div className="shop-product-card__commerce">
                          <span className="shop-price">{formatWorklistPrice(product.price_cents)}</span>
                          <ListingStockLine product={product} />
                        </div>
                        <div className="shop-product-card__actions">
                          <button
                            aria-label={`${t("shop.product.view")}: ${product.name}`}
                            className="worklist-view-product"
                            onClick={() => onViewProduct(product.id)}
                            type="button"
                          >
                            {t("shop.product.view")} <span aria-hidden="true">→</span>
                          </button>
                          {PURCHASE_ENABLED ? (
                          <button
                            aria-label={`${t("shop.product.add")}: ${product.name}`}
                            className="shop-add-to-cart"
                            disabled={stockState === "out"}
                            onClick={() => onAddToCart(product)}
                            type="button"
                          >
                            {t("shop.product.add")}
                          </button>
                          ) : (
                          <a
                            aria-label={`${t("shop.purchase.askPrice")}: ${product.name}`}
                            className="shop-add-to-cart"
                            href={askPriceHref(product.name)}
                            rel="noopener"
                            target="_blank"
                          >
                            {t("shop.purchase.askPrice")}
                          </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {!isRefetching && filteredProducts.length < totalProducts ? (
              <div className="shop-load-more">
                <p aria-live="polite">
                  {t("shop.listing.shownOfTotal", {
                    shown: filteredProducts.length,
                    total: totalProducts
                  })}
                </p>
                <button
                  className="outline-button"
                  disabled={isLoadingMoreProducts}
                  onClick={onLoadMoreProducts}
                  type="button"
                >
                  {isLoadingMoreProducts ? t("shop.listing.loading") : t("shop.listing.loadMore")}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
