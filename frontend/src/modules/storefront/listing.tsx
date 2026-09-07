import { useState } from "react";
import { useI18n } from "../../i18n/LanguageContext";
import type { JobLens, JobLensId } from "./jobLenses";
import type {
  Category,
  Product,
  StorefrontPayload,
  StorefrontSort
} from "../../types";
import type { PublicOffersPayload } from "../offers/types";


export type StorefrontViewProps = {
  activeJobId: JobLensId | null;
  filteredProducts: Product[];
  isRefetching: boolean;
  isShowingFallbackData: boolean;
  isLoadingMoreProducts: boolean;
  onLoadMoreProducts: () => void;
  totalProducts: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  onChangeInStockOnly: (next: boolean) => void;
  onChangeOnSaleOnly: (next: boolean) => void;
  maxPriceCents: number | null;
  minPriceCents: number | null;
  onAddToCart: (product: Product) => void;
  onChangeCategory: (slug: string) => void;
  onChangeMaxPrice: (value: number | null) => void;
  onChangeMinPrice: (value: number | null) => void;
  onChangeSearch: (value: string) => void;
  onChangeSort: (value: StorefrontSort) => void;
  onGrabPromotion: (promotionId: number) => void;
  onReturnFocusComplete: () => void;
  onSelectJob: (jobId: JobLensId) => void;
  onViewProduct: (productId: number) => void;
  publicOffers: PublicOffersPayload | null;
  returnFocusProductId: number | null;
  searchTerm: string;
  selectedCategory: string;
  sortOption: StorefrontSort;
  storefront: StorefrontPayload;
};

export const PRICE_PRESETS: { minCents: number; maxCents: number | null }[] = [
  { minCents: 0, maxCents: 5000 },
  { minCents: 5000, maxCents: 15000 },
  { minCents: 15000, maxCents: 50000 },
  { minCents: 50000, maxCents: null }
];

export function productStockState(product: Product): "in" | "low" | "out" {
  if (product.stock_quantity <= 0) return "out";
  if (product.stock_quantity <= product.low_stock_threshold) return "low";
  return "in";
}

export function isOnSale(product: Product): boolean {
  return /sale/i.test(product.badge);
}

export const GENERIC_PLACEHOLDER_IMAGE_HOSTS = [
  "dummyimage.com",
  "lorempixel.com",
  "loremflickr.com",
  "picsum.photos",
  "placehold.co",
  "placehold.it",
  "placeholder.com",
  "via.placeholder.com"
];

export function isGenericPlaceholderImage(imageUrl: string): boolean {
  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) return true;

  try {
    const hostname = new URL(trimmedUrl, window.location.origin).hostname.toLowerCase();
    return GENERIC_PLACEHOLDER_IMAGE_HOSTS.some(
      (placeholderHost) => hostname === placeholderHost || hostname.endsWith(`.${placeholderHost}`)
    );
  } catch {
    return false;
  }
}

export function IconClose() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Listing-specific stock line (real quantity, not just the state word).
export function ListingStockLine({ product }: { product: Product }) {
  const { t } = useI18n();
  const state = productStockState(product);

  if (state === "out") {
    return (
      <span className="avail avail--out">
        <i aria-hidden="true" />
        {t("shop.product.stock.out")}
      </span>
    );
  }

  if (state === "low") {
    return (
      <span className="avail avail--low">
        <i aria-hidden="true" />
        {t("shop.product.stock.lowCount", { n: product.stock_quantity })}
      </span>
    );
  }

  return (
    <span className="avail avail--in">
      <i aria-hidden="true" />
      {t("shop.product.stock.in")}
    </span>
  );
}

// Shared missing-image / real-image media button for both listing modes — consistent
// treatment everywhere, per design/SYSTEM.md §6 and design/assets/ICON-GUIDE.md.
export function ListingProductMedia({
  onOpen,
  product
}: {
  onOpen: () => void;
  product: Product;
}) {
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !imageFailed && !isGenericPlaceholderImage(product.image_url);

  return (
    <button
      aria-label={`${t("shop.product.view")}: ${product.name}`}
      className="shop-listing-media"
      onClick={onOpen}
      type="button"
    >
      {showImage ? (
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="shop-missing-image">
          <span className="shop-missing-image-mark" aria-hidden="true" />
          <span>
            <span className="shop-missing-image-department">{product.category_slug.replaceAll("-", " ")}</span>
            <span className="shop-missing-image-caption">{t("shop.listing.noPhoto")}</span>
          </span>
        </span>
      )}
    </button>
  );
}


export function JobBand({
  activeJob,
  departmentCount,
  jobs,
  onSelectJob,
  productCount
}: {
  activeJob: JobLens | null;
  departmentCount: number;
  jobs: JobLens[];
  onSelectJob: (jobId: JobLensId) => void;
  productCount: number;
}) {
  const { t } = useI18n();

  return (
    <section className="worklist-job-band" aria-label={t("shop.jobs.workingOn")}>
      <span className="worklist-job-band__label">{t("shop.jobs.workingOn")}</span>
      <div className="worklist-job-band__options">
        {jobs.map((job) => (
          <button
            aria-pressed={activeJob?.id === job.id}
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            type="button"
          >
            {job.name}
          </button>
        ))}
      </div>
      <dl className="worklist-job-band__result">
        <dt>{t("shop.jobs.resolvesTo")}</dt>
        <dd>{t("shop.jobs.summary", { departments: departmentCount, products: productCount })}</dd>
      </dl>
    </section>
  );
}

export function JobContextRail({
  categories,
  job,
  products
}: {
  categories: Category[];
  job: JobLens;
  products: Product[];
}) {
  const { t } = useI18n();
  const counts = products.reduce<Map<string, number>>((result, product) => {
    result.set(product.category_slug, (result.get(product.category_slug) ?? 0) + 1);
    return result;
  }, new Map());
  const departments = job.departmentSlugs
    .map((slug) => ({ category: categories.find((category) => category.slug === slug), count: counts.get(slug) ?? 0 }))
    .filter((item): item is { category: Category; count: number } => item.category !== undefined && item.count > 0);

  return (
    <aside className="worklist-context-rail" aria-label={t("shop.jobs.context")}>
      <h1>{job.name}</h1>
      <p className="worklist-context-rail__note">{job.note}</p>
      <div className="worklist-context-rail__atmosphere">
        <p>
          {t("shop.jobs.atmosphere")}
          <span>{job.atmosphere}</span>
        </p>
      </div>
      <p className="worklist-context-rail__disclosure">{t("shop.jobs.inspirationDisclosure")}</p>
      <div className="worklist-context-rail__departments">
        <h2>{t("shop.jobs.departments")}</h2>
        {departments.map(({ category, count }) => (
          <div key={category!.slug}>
            <span>{category!.name}</span>
            <b>{count}</b>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function JobContextDisclosure({
  categories,
  job,
  products
}: {
  categories: Category[];
  job: JobLens;
  products: Product[];
}) {
  const { t } = useI18n();
  const counts = products.reduce<Map<string, number>>((result, product) => {
    result.set(product.category_slug, (result.get(product.category_slug) ?? 0) + 1);
    return result;
  }, new Map());
  const departments = job.departmentSlugs
    .map((slug) => ({ category: categories.find((category) => category.slug === slug), count: counts.get(slug) ?? 0 }))
    .filter((item): item is { category: Category; count: number } => item.category !== undefined && item.count > 0);

  return (
    <section className="worklist-context-mobile" aria-label={t("shop.jobs.context")}>
      <h1>{job.name}</h1>
      <p>{job.note}</p>
      <details>
        <summary>{t("shop.jobs.context")}</summary>
        <div className="worklist-context-mobile__details">
          <div className="worklist-context-mobile__atmosphere">
            <p>
              {t("shop.jobs.atmosphere")}
              <span>{job.atmosphere}</span>
            </p>
          </div>
          <p className="worklist-context-mobile__disclosure">{t("shop.jobs.inspirationDisclosure")}</p>
          <div className="worklist-context-mobile__departments">
            <h2>{t("shop.jobs.departments")}</h2>
            {departments.map(({ category, count }) => (
              <div key={category!.slug}>
                <span>{category!.name}</span>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

export function ShopListingSkeletonRows({ count }: { count: number }) {
  return (
    <div className="shop-listing-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="shop-listing-skeleton-row" key={index}>
          <span className="shop-skeleton-block shop-skeleton-media" />
          <span className="shop-skeleton-block shop-skeleton-line" />
          <span className="shop-skeleton-block shop-skeleton-line shop-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export type EmptyResultsProps = {
  hasSearch: boolean;
  onBrowseAll: () => void;
  onClearAll: () => void;
  onClearSearch: () => void;
  searchTerm: string;
};

export function EmptyResults({ hasSearch, onBrowseAll, onClearAll, onClearSearch, searchTerm }: EmptyResultsProps) {
  const { t } = useI18n();

  return (
    <div className="shop-empty-state" role="status">
      <h3>{t("shop.listing.empty.title")}</h3>
      <p>
        {hasSearch
          ? t("shop.listing.empty.searchBody", { query: searchTerm })
          : t("shop.listing.empty.filterBody")}
      </p>
      <div className="shop-empty-state-actions">
        {hasSearch ? (
          <button className="shop-empty-action" onClick={onClearSearch} type="button">
            {t("shop.listing.empty.clearSearch")}
          </button>
        ) : null}
        <button className="shop-empty-action" onClick={onClearAll} type="button">
          {t("shop.filters.clearAll")}
        </button>
        <button className="shop-empty-action shop-empty-action--primary" onClick={onBrowseAll} type="button">
          {t("shop.listing.empty.browseAll")}
        </button>
      </div>
    </div>
  );
}
