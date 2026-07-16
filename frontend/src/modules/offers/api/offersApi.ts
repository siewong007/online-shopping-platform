import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  Promotion,
  PublicOffersPayload,
  UpdatePromotionInput,
  UpdateVoucherInput,
  Voucher
} from "../types";

const fallbackPromotions: Promotion[] = [];
const fallbackVouchers: Voucher[] = [];
const fallbackPublicOffers: PublicOffersPayload = { promotions: [], vouchers: [] };

export function fetchPublicOffers(): Promise<PublicOffersPayload> {
  return fetchJson("/api/offers", fallbackPublicOffers, "customer");
}

export function fetchPromotions(): Promise<Promotion[]> {
  return fetchJson("/api/admin/promotions", fallbackPromotions);
}

export function createPromotion(input: CreatePromotionInput): Promise<Promotion> {
  return postJson<CreatePromotionInput, Promotion>("/api/admin/promotions", input);
}

export function updatePromotion(
  promotionId: number,
  input: UpdatePromotionInput
): Promise<Promotion> {
  return putJson<UpdatePromotionInput, Promotion>(
    `/api/admin/promotions/${promotionId}`,
    input
  );
}

export function deletePromotion(promotionId: number): Promise<void> {
  return deleteJson(`/api/admin/promotions/${promotionId}`);
}

export function fetchVouchers(): Promise<Voucher[]> {
  return fetchJson("/api/admin/vouchers", fallbackVouchers);
}

export function createVoucher(input: CreateVoucherInput): Promise<Voucher> {
  return postJson<CreateVoucherInput, Voucher>("/api/admin/vouchers", input);
}

export function updateVoucher(voucherId: number, input: UpdateVoucherInput): Promise<Voucher> {
  return putJson<UpdateVoucherInput, Voucher>(`/api/admin/vouchers/${voucherId}`, input);
}

export function deleteVoucher(voucherId: number): Promise<void> {
  return deleteJson(`/api/admin/vouchers/${voucherId}`);
}
