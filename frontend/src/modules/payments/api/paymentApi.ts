import { fallbackPayments } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type { CreatePaymentInput, Payment, UpdatePaymentInput } from "../types";

export function fetchPayments(): Promise<Payment[]> {
  return fetchJson("/api/admin/payments", fallbackPayments);
}

export function createPayment(
  input: CreatePaymentInput,
  adminRoleId: number
): Promise<Payment> {
  return postJson<CreatePaymentInput, Payment>("/api/admin/payments", input, adminRoleId);
}

export function updatePayment(
  paymentId: number,
  input: UpdatePaymentInput,
  adminRoleId: number
): Promise<Payment> {
  return putJson<UpdatePaymentInput, Payment>(
    `/api/admin/payments/${paymentId}`,
    input,
    adminRoleId
  );
}

export function deletePayment(paymentId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/payments/${paymentId}`, adminRoleId);
}
