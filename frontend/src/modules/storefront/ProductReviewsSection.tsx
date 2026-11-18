import { type FormEvent, useState } from "react";

import { intlLocaleFor, useI18n } from "../../i18n/LanguageContext";
import { TurnstileSlot, useTurnstile } from "../../shared/components/TurnstileSlot";
import { normalizeError } from "../../shared/notifications";
import { createProductReview } from "../reviews/api/reviewsApi";
import type { ProductReview } from "../reviews/types";

type ProductReviewsSectionProps = {
  productId: number;
  reviews: ProductReview[];
  avgRating: number | null;
  reviewCount: number;
  canReview: boolean;
  alreadyReviewed: boolean;
  onReviewCreated: (review: ProductReview) => void;
};

function formatReviewDate(raw: string, locale: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
}

/** Lazy Turnstile review form; mounts only when an eligible buyer opens the composer. */
function ReviewComposer({
  productId,
  onCancel,
  onSuccess
}: {
  productId: number;
  onCancel: () => void;
  onSuccess: (review: ProductReview) => void;
}) {
  const { t } = useI18n();
  const turnstile = useTurnstile();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createProductReview(
        productId,
        { rating, body: trimmed },
        turnstile.token
      );
      onSuccess(created);
    } catch (caught) {
      turnstile.reset();
      setError(
        normalizeError(caught, {
          operation: "submit product review",
          scope: "product-review"
        }).userMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="pdp-reviews__form" onSubmit={handleSubmit}>
      <div
        className="pdp-reviews__rating-group"
        role="group"
        aria-label={t("shop.reviews.ratingLabel")}
      >
        <span className="pdp-reviews__field-label">{t("shop.reviews.ratingLabel")}</span>
        <div className="pdp-reviews__stars">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              aria-label={t("shop.reviews.starAria", { n: score })}
              aria-pressed={rating === score}
              className={`pdp-reviews__star${rating >= score ? " is-selected" : ""}`}
              key={score}
              onClick={() => setRating(score)}
              type="button"
            >
              ★ {score}
            </button>
          ))}
        </div>
      </div>

      <label className="pdp-reviews__field">
        <span className="pdp-reviews__field-row">
          <span>{t("shop.reviews.bodyLabel")}</span>
          <em>{body.length}/2000</em>
        </span>
        <textarea
          disabled={isSubmitting}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("shop.reviews.bodyPlaceholder")}
          required
          rows={4}
          value={body}
        />
      </label>

      <TurnstileSlot turnstile={turnstile} />

      {error ? (
        <p className="pdp-reviews__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pdp-reviews__form-actions">
        <button className="pdp-reviews__cancel" onClick={onCancel} type="button">
          {t("shop.reviews.cancelAction")}
        </button>
        <button
          className="pdp-reviews__submit"
          disabled={isSubmitting || !body.trim() || (turnstile.isConfigured && !turnstile.token)}
          type="submit"
        >
          {isSubmitting ? t("shop.reviews.submitting") : t("shop.reviews.submitAction")}
        </button>
      </div>
    </form>
  );
}

/**
 * Verified customer reviews strip displayed below Verified Information on PDP.
 * Stays hidden on unreviewed products for non-reviewers to preserve Pass 3 PDP restraint.
 */
export function ProductReviewsSection({
  productId,
  reviews,
  avgRating,
  reviewCount,
  canReview,
  alreadyReviewed,
  onReviewCreated
}: ProductReviewsSectionProps) {
  const { lang, t } = useI18n();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  if (reviews.length === 0 && !canReview && !alreadyReviewed) {
    return null;
  }

  const locale = intlLocaleFor(lang);
  const count = reviewCount > 0 ? reviewCount : reviews.length;
  const computedAvg =
    avgRating ??
    (reviews.length > 0
      ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
      : null);

  return (
    <section className="pdp-reviews" aria-labelledby="pdp-reviews-heading">
      <header className="pdp-reviews__header">
        <div>
          <p className="pdp-reviews__eyebrow">{t("shop.reviews.eyebrow")}</p>
          <h2 id="pdp-reviews-heading">{t("shop.reviews.title")}</h2>
          {count > 0 && computedAvg != null ? (
            <p className="pdp-reviews__summary">
              {t("shop.reviews.summary", {
                rating: computedAvg.toFixed(1),
                n: count
              })}
            </p>
          ) : null}
        </div>

        <div className="pdp-reviews__header-action">
          {alreadyReviewed ? (
            <span className="pdp-reviews__submitted">{t("shop.reviews.submittedBadge")}</span>
          ) : canReview && !isComposerOpen ? (
            <button
              className="pdp-reviews__write"
              onClick={() => {
                setJustSubmitted(false);
                setIsComposerOpen(true);
              }}
              type="button"
            >
              {t("shop.reviews.writeAction")}
            </button>
          ) : null}
        </div>
      </header>

      {justSubmitted ? (
        <p className="pdp-reviews__notice" role="status">
          {t("shop.reviews.publishedNotice")}
        </p>
      ) : null}

      {canReview && !alreadyReviewed && isComposerOpen ? (
        <ReviewComposer
          onCancel={() => setIsComposerOpen(false)}
          onSuccess={(review) => {
            setIsComposerOpen(false);
            setJustSubmitted(true);
            onReviewCreated(review);
          }}
          productId={productId}
        />
      ) : null}

      {reviews.length > 0 ? (
        <ul className="pdp-reviews__list">
          {reviews.map((review) => (
            <li className="pdp-reviews__item" key={review.id}>
              <div className="pdp-reviews__meta">
                <span className="pdp-reviews__score">★ {review.rating}/5</span>
                <strong>{review.customer_display_name}</strong>
                <span className="pdp-reviews__verified">{t("shop.reviews.verifiedTag")}</span>
                <time dateTime={review.created_at}>
                  {formatReviewDate(review.created_at, locale)}
                </time>
              </div>
              <p className="pdp-reviews__body">{review.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
