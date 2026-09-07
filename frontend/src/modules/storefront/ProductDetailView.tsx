import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/LanguageContext";
import { fetchProductDetail } from "../../lib/api";
import { ApiError } from "../../shared/api/http";
import type { Product, ProductDetailPayload, StorefrontPayload } from "../../types";

import { askPriceHref, formatWorklistPrice, PURCHASE_ENABLED } from "./helpers";
import {
  isGenericPlaceholderImage,
  ListingProductMedia,
  ListingStockLine,
  productStockState
} from "./listing";

type ProductDetailViewProps = {
  activeJobName: string | null;
  fallbackProduct: Product | null;
  isCatalogueLoaded: boolean;
  onAddToCart: (product: Product) => void;
  onBack: () => void;
  onOpenDepartment: (slug: string) => void;
  onViewProduct: (productId: number) => void;
  productId: number | null;
  storefront: StorefrontPayload;
};

export function ProductDetailView({
  activeJobName,
  fallbackProduct,
  isCatalogueLoaded,
  onAddToCart,
  onBack,
  onOpenDepartment,
  onViewProduct,
  productId,
  storefront
}: ProductDetailViewProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "loaded" | "not-found" | "error">("loading");
  const [payload, setPayload] = useState<ProductDetailPayload | null>(null);
  const [isFallbackDetail, setIsFallbackDetail] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [retryVersion, setRetryVersion] = useState(0);
  const [showCondensedActions, setShowCondensedActions] = useState(false);
  const primaryActionsRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const hasSeenPrimaryActions = useRef(false);

  useLayoutEffect(() => {
    window.scrollTo({ behavior: "auto", left: 0, top: 0 });
  }, [productId]);

  useEffect(() => {
    if (productId == null) {
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setPayload(null);
    setIsFallbackDetail(false);
    setImageFailed(false);
    setQuantity(1);
    setShowCondensedActions(false);
    hasSeenPrimaryActions.current = false;

    fetchProductDetail(productId)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setStatus("loaded");
      })
      .catch((error) => {
        if (cancelled) return;

        if (fallbackProduct) {
          setPayload({ product: fallbackProduct, reviews: [], can_review: false, already_reviewed: false });
          setIsFallbackDetail(true);
          setStatus("loaded");
          return;
        }

        if (!isCatalogueLoaded) return;
        setStatus(error instanceof ApiError && error.status === 404 ? "not-found" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackProduct, isCatalogueLoaded, productId, retryVersion]);

  useEffect(() => {
    const actions = primaryActionsRef.current;
    if (!actions || status !== "loaded" || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          hasSeenPrimaryActions.current = true;
          setShowCondensedActions(false);
        } else {
          setShowCondensedActions(hasSeenPrimaryActions.current && entry.boundingClientRect.top < 0);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(actions);
    return () => observer.disconnect();
  }, [productId, status]);

  useEffect(() => {
    if (status !== "loading") headingRef.current?.focus({ preventScroll: true });
  }, [productId, status]);

  const renderContextBar = (
    categoryName?: string,
    categorySlug?: string,
    productName?: string,
    productCount?: number
  ) => (
    <div className="pdp-context-bar">
      <button className="pdp-context-back" onClick={onBack} type="button">
        <span aria-hidden="true">←</span>
        <span className="pdp-context-back__desktop">{t("shop.detail.backProducts")}</span>
        <span className="pdp-context-back__mobile">
          {categoryName ? t("shop.detail.allDepartment", { department: categoryName }) : t("shop.detail.backProducts")}
        </span>
      </button>
      {categoryName && categorySlug && productName ? (
        <>
          <i className="pdp-context-divider" aria-hidden="true" />
          <nav className="pdp-breadcrumb" aria-label={t("shop.detail.breadcrumb")}>
            <button onClick={() => onOpenDepartment("all")} type="button">{t("shop.dept.all.short")}</button>
            <i aria-hidden="true">/</i>
            <button onClick={() => onOpenDepartment(categorySlug)} type="button">{categoryName}</button>
            <i aria-hidden="true">/</i>
            <b aria-current="page">{productName}</b>
          </nav>
          {activeJobName ? (
            <p className="pdp-context-job">
              {t("shop.detail.stillWorkingOn")} <b>{activeJobName}</b>
            </p>
          ) : null}
          {productCount != null ? (
            <em className="pdp-context-count">{t("shop.detail.productCount", { n: productCount })}</em>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (status === "loading") {
    return (
      <main className="pdp-shell">
        {renderContextBar()}
        <section className="pdp-state-panel" aria-live="polite"><p>{t("shop.loading")}</p></section>
      </main>
    );
  }

  if (status === "not-found" || status === "error" || !payload) {
    return (
      <main className="pdp-shell">
        {renderContextBar()}
        <section className="pdp-not-found" role={status === "error" ? "alert" : undefined}>
          <h1 ref={headingRef} tabIndex={-1}>{status === "error" ? t("shop.detail.errorTitle") : t("shop.detail.notFoundTitle")}</h1>
          <p>{status === "error" ? t("shop.detail.errorBody") : t("shop.detail.notFoundBody")}</p>
          <div className="pdp-not-found__actions">
            {status === "error" ? (
              <button className="pdp-add" onClick={() => setRetryVersion((current) => current + 1)} type="button">
                {t("shop.detail.retry")}
              </button>
            ) : null}
            <button className="pdp-add" onClick={onBack} type="button">{t("shop.detail.backProducts")}</button>
            <a className="pdp-whatsapp" href="https://wa.me/60174056993" rel="noopener" target="_blank">
              <i aria-hidden="true" />{t("shop.detail.askStore")}
            </a>
          </div>
        </section>
      </main>
    );
  }

  const { product } = payload;
  const stockState = productStockState(product);
  const showProductImage = !imageFailed && !isGenericPlaceholderImage(product.image_url);
  const categoryName =
    storefront.categories.find((category) => category.slug === product.category_slug)?.name ??
    product.category_slug.replaceAll("-", " ");
  const departmentProducts = storefront.products.filter((item) => item.category_slug === product.category_slug);
  const continuationProducts = departmentProducts.filter((item) => item.id !== product.id).slice(0, 4);
  const stockLabel =
    stockState === "out"
      ? t("shop.product.stock.out")
      : stockState === "low"
        ? t("shop.product.stock.lowCount", { n: product.stock_quantity })
        : t("shop.product.stock.in");
  const whatsappHref = `https://wa.me/60174056993?text=${encodeURIComponent(
    t("shop.detail.whatsappMessage", { product: product.name })
  )}`;

  const addSelectedQuantity = () => {
    for (let index = 0; index < quantity; index += 1) onAddToCart(product);
  };

  const quantityControl = (condensed = false) => (
    <div className={`pdp-quantity${condensed ? " pdp-quantity--condensed" : ""}`} role="group" aria-label={t("shop.detail.quantity")}>
      <button
        aria-label={t("shop.detail.decreaseQuantity")}
        disabled={stockState === "out" || quantity <= 1}
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
        type="button"
      >−</button>
      <input aria-label={t("shop.detail.quantity")} disabled={stockState === "out"} inputMode="numeric" readOnly value={quantity} />
      <button
        aria-label={t("shop.detail.increaseQuantity")}
        disabled={stockState === "out" || quantity >= product.stock_quantity}
        onClick={() => setQuantity((current) => Math.min(product.stock_quantity, current + 1))}
        type="button"
      >+</button>
    </div>
  );

  return (
    <main className={`pdp-shell${showCondensedActions ? " pdp-shell--condensed" : ""}`}>
      {renderContextBar(categoryName, product.category_slug, product.name, departmentProducts.length)}

      <section className="pdp-primary">
        <figure className="pdp-viewer">
          {showProductImage ? (
            <img className="pdp-viewer__image" src={product.image_url} alt={product.name} onError={() => setImageFailed(true)} />
          ) : (
            <span className="pdp-missing-image">
              <span className="pdp-missing-image__mark" aria-hidden="true" />
              <span>
                <span className="pdp-missing-image__department">{categoryName}</span>
                <span className="pdp-missing-image__copy">{t("shop.listing.noPhoto")}</span>
              </span>
            </span>
          )}
        </figure>

        <aside className="pdp-buy" aria-label={t("shop.detail.purchase")}>
          {isFallbackDetail ? (
            <div className="pdp-fallback-notice" role="status">
              <b>{t("shop.detail.savedCatalogue")}</b>
              <p>{t("shop.detail.savedCatalogueBody")}</p>
            </div>
          ) : null}
          <span className="pdp-buy__department">{categoryName}</span>
          <h1 className="pdp-buy__name" ref={headingRef} tabIndex={-1}>{product.name}</h1>
          <div className="pdp-buy__rule" aria-hidden="true" />
          <div className="pdp-buy__price">{formatWorklistPrice(product.price_cents)}</div>
          {!PURCHASE_ENABLED ? <p className="pdp-price-note">{t("shop.purchase.priceNote")}</p> : null}
          <div className={`pdp-stock pdp-stock--${stockState}`}><i aria-hidden="true" /><span>{stockLabel}</span></div>
          <div className="pdp-primary-actions" ref={primaryActionsRef}>
            {PURCHASE_ENABLED ? quantityControl() : null}
            {PURCHASE_ENABLED ? (
            <button className="pdp-add" disabled={stockState === "out"} onClick={addSelectedQuantity} type="button">
              {stockState === "out" ? t("shop.product.stock.out") : t("shop.product.add")}
            </button>
            ) : (
            <a className="pdp-add" href={whatsappHref} rel="noopener" target="_blank">
              {t("shop.purchase.askPrice")}
            </a>
            )}
          </div>
          <a
            className={`pdp-whatsapp${stockState === "out" ? " pdp-whatsapp--lead" : ""}`}
            href={whatsappHref}
            rel="noopener"
            target="_blank"
          >
            <i aria-hidden="true" />{t("shop.detail.askWhatsapp")}
          </a>
          {departmentProducts.length > 0 ? (
            <div className="pdp-buy__foot">
              <button onClick={() => onOpenDepartment(product.category_slug)} type="button">
                ← {t("shop.detail.allDepartment", { department: categoryName })}
              </button>
              <em>{t("shop.detail.productCount", { n: departmentProducts.length })}</em>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="pdp-verified" aria-labelledby="pdp-verified-heading">
        <h2 id="pdp-verified-heading">{t("shop.detail.verifiedInformation")}</h2>
        <dl>
          <div><dt>{t("shop.detail.department")}</dt><dd>{categoryName}</dd></div>
          <div><dt>{t("shop.detail.price")}</dt><dd className="pdp-mono">{formatWorklistPrice(product.price_cents)}</dd></div>
          <div><dt>{t("shop.detail.availability")}</dt><dd>{stockLabel}</dd></div>
        </dl>
        <p>{t("shop.detail.verifiedNote")}</p>
      </section>

      {continuationProducts.length > 0 ? (
        <section className="pdp-more" aria-labelledby="pdp-more-heading">
          <header>
            <h2 id="pdp-more-heading">{t("shop.detail.moreIn", { department: categoryName })}</h2>
            <em>{t("shop.detail.departmentProductCount", { n: departmentProducts.length })}</em>
            <button onClick={() => onOpenDepartment(product.category_slug)} type="button">
              {t("shop.detail.allDepartment", { department: categoryName })} →
            </button>
          </header>
          <div className="shop-card-grid pdp-more__grid">
            {continuationProducts.map((item) => (
              <article className="shop-product-card" key={item.id}>
                <ListingProductMedia product={item} onOpen={() => onViewProduct(item.id)} />
                <div className="shop-product-card-body">
                  <span className="shop-product-category">{categoryName}</span>
                  <h3>
                    <button
                      aria-label={`${t("shop.product.view")}: ${item.name}`}
                      className="shop-listing-name-link"
                      onClick={() => onViewProduct(item.id)}
                      type="button"
                    >
                      {item.name}
                    </button>
                  </h3>
                  <div className="shop-product-card__commerce">
                    <span className="shop-price">{formatWorklistPrice(item.price_cents)}</span>
                    <ListingStockLine product={item} />
                  </div>
                  <div className="shop-product-card__actions">
                    <button
                      aria-label={`${t("shop.product.view")}: ${item.name}`}
                      className="worklist-view-product"
                      onClick={() => onViewProduct(item.id)}
                      type="button"
                    >
                      {t("shop.product.view")} <span aria-hidden="true">→</span>
                    </button>
                    {PURCHASE_ENABLED ? (
                    <button
                      aria-label={`${t("shop.product.add")}: ${item.name}`}
                      className="shop-add-to-cart"
                      disabled={productStockState(item) === "out"}
                      onClick={() => onAddToCart(item)}
                      type="button"
                    >{t("shop.product.add")}</button>
                    ) : (
                    <a
                      aria-label={`${t("shop.purchase.askPrice")}: ${item.name}`}
                      className="shop-add-to-cart"
                      href={askPriceHref(item.name)}
                      rel="noopener"
                      target="_blank"
                    >{t("shop.purchase.askPrice")}</a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showCondensedActions ? (
        <div className="pdp-condensed-actions" role="region" aria-label={t("shop.detail.purchase")}>
          <dl>
            <dt>{formatWorklistPrice(product.price_cents)}</dt>
            <dd className={`pdp-stock pdp-stock--${stockState}`}><i aria-hidden="true" />{stockLabel}</dd>
          </dl>
          {PURCHASE_ENABLED ? quantityControl(true) : null}
          {PURCHASE_ENABLED ? (
          <button className="pdp-add" disabled={stockState === "out"} onClick={addSelectedQuantity} type="button">
            {stockState === "out" ? t("shop.product.stock.out") : t("shop.product.add")}
          </button>
          ) : (
          <a className="pdp-add" href={whatsappHref} rel="noopener" target="_blank">
            {t("shop.purchase.askPrice")}
          </a>
          )}
        </div>
      ) : null}
    </main>
  );
}
