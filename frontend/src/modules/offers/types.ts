export type DiscountType = "fixed_cents" | "percent_bps";

export type PublicPromotion = {
  id: number;
  label: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_subtotal_cents: number;
  is_stackable: boolean;
};

export type PublicVoucher = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_subtotal_cents: number;
  is_stackable: boolean;
};

export type PublicOffersPayload = {
  promotions: PublicPromotion[];
  vouchers: PublicVoucher[];
};

export type Promotion = {
  id: number;
  label: string;
  title: string;
  description: string;
  discount_type: DiscountType | null;
  discount_value: number | null;
  minimum_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_stackable: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  created_at: string;
  updated_at: string;
};

export type Voucher = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_stackable: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePromotionInput = {
  label: string;
  title: string;
  description: string;
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  minimum_subtotal_cents?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_stackable?: boolean;
  max_redemptions?: number | null;
};

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export type CreateVoucherInput = {
  code: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_subtotal_cents?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_stackable?: boolean;
  max_redemptions?: number | null;
  is_public?: boolean;
};

export type UpdateVoucherInput = Partial<CreateVoucherInput>;
