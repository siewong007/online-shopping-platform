import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LanguageProvider } from "../../src/i18n/LanguageContext";
import { ProductReviewsSection } from "../../src/modules/storefront/ProductReviewsSection";
import type { ProductReview } from "../../src/modules/reviews/types";

const sampleReview: ProductReview = {
  id: 7,
  customer_display_name: "Ah Seng Contractor",
  rating: 5,
  body: "Holds charge well through a full day on roofing sheets.",
  created_at: "2026-10-15T08:00:00Z"
};

function renderReviews(props: {
  reviews?: ProductReview[];
  avgRating?: number | null;
  reviewCount?: number;
  canReview?: boolean;
  alreadyReviewed?: boolean;
}): string {
  return renderToStaticMarkup(
    <LanguageProvider>
      <ProductReviewsSection
        alreadyReviewed={props.alreadyReviewed ?? false}
        avgRating={props.avgRating ?? null}
        canReview={props.canReview ?? false}
        onReviewCreated={() => {}}
        productId={10}
        reviewCount={props.reviewCount ?? props.reviews?.length ?? 0}
        reviews={props.reviews ?? []}
      />
    </LanguageProvider>
  );
}

describe("ProductReviewsSection", () => {
  test("renders nothing for unreviewed items when visitor cannot review", () => {
    expect(renderReviews({})).toBe("");
  });

  test("renders verified review cards and summary score", () => {
    const html = renderReviews({
      reviews: [sampleReview],
      avgRating: 5,
      reviewCount: 1
    });

    expect(html).toContain('class="pdp-reviews"');
    expect(html).toContain("Customer reviews");
    expect(html).toContain("5.0 / 5 from 1 verified reviews");
    expect(html).toContain("Ah Seng Contractor");
    expect(html).toContain("Verified purchase");
    expect(html).toContain("Holds charge well through a full day on roofing sheets.");
  });

  test("renders write CTA for verified buyers without mounting Turnstile eagerly, and badge when submitted", () => {
    const canWriteHtml = renderReviews({ canReview: true });
    expect(canWriteHtml).toContain("Write a review");
    expect(canWriteHtml).not.toContain('class="turnstile-slot"');

    const alreadyHtml = renderReviews({
      reviews: [sampleReview],
      avgRating: 5,
      reviewCount: 1,
      alreadyReviewed: true
    });
    expect(alreadyHtml).toContain("Verified review submitted");
    expect(alreadyHtml).not.toContain("Write a review");
  });
});
