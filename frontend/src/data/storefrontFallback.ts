import type { StorefrontPayload } from "../types";
import type { PublicOffersPayload, Promotion, Voucher } from "../modules/offers/types";

export const fallbackPromotions: Promotion[] = [];
export const fallbackVouchers: Voucher[] = [];
export const fallbackPublicOffers: PublicOffersPayload = { promotions: [], vouchers: [] };

// A customer must never see or attempt to buy demonstration merchandise when the API is
// unavailable. Keep the larger admin fixtures in `fallback.ts` isolated from customer chunks.
export const fallbackStorefront: StorefrontPayload = {
  total_products: 0,
  category_counts: [],
  categories: [
    {
      slug: "all",
      name: "Shop All Departments",
      teaser: "Products are temporarily unavailable. Please try again shortly."
    }
  ],
  products: [],
  promotions: [],
  services: [],
  pro_stats: []
};
