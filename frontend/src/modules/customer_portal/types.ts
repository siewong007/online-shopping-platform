import type { CustomerLookupProfile } from "../customer/types";

export type MembershipTier = {
  name: string;
  rank: number;
  min_lifetime_purchase_cents: number;
};

export type NextMembershipTier = {
  name: string;
  min_lifetime_purchase_cents: number;
  remaining_cents: number;
};

export type MembershipPayload = {
  profile: CustomerLookupProfile;
  current_tier: MembershipTier | null;
  next_tier: NextMembershipTier | null;
};

export type MembershipBenefit = {
  title: string;
  description: string | null;
};

export type MembershipTierWithBenefits = {
  name: string;
  rank: number;
  min_lifetime_purchase_cents: number;
  benefits: MembershipBenefit[];
};

export type MembershipBenefitsPayload = {
  current_tier: string | null;
  tiers: MembershipTierWithBenefits[];
};

export type CustomerTransactionItem = {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

export type CustomerTransactionPayment = {
  method: string;
  status: string;
  amount_cents: number;
  reference: string;
  processed_at: string | null;
};

export type CustomerTransaction = {
  id: number;
  created_at: string;
  status: string;
  subtotal_cents: number;
  fulfillment_method: string;
  items: CustomerTransactionItem[];
  payments: CustomerTransactionPayment[];
};

export type CustomerTransactionsPayload = {
  total: number;
  transactions: CustomerTransaction[];
};

export type CustomerTransactionsQueryParams = {
  limit?: number;
  offset?: number;
};
