import { fallbackInvoices } from "../../../data/fallback";
import { fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  CreateInvoiceFromOrderInput,
  Invoice,
  RecordInvoicePaymentInput,
  UpdateInvoiceBillingInput
} from "../types";

export function fetchInvoices(): Promise<Invoice[]> {
  return fetchJson("/api/admin/invoices", fallbackInvoices);
}

export function createInvoiceFromOrder(
  orderId: number,
  input: CreateInvoiceFromOrderInput,
  adminRoleId: number
): Promise<Invoice> {
  return postJson<CreateInvoiceFromOrderInput, Invoice>(
    `/api/admin/invoices/from-order/${orderId}`,
    input,
    adminRoleId
  );
}

export function updateInvoiceBilling(
  invoiceId: number,
  input: UpdateInvoiceBillingInput,
  adminRoleId: number
): Promise<Invoice> {
  return putJson<UpdateInvoiceBillingInput, Invoice>(
    `/api/admin/invoices/${invoiceId}`,
    input,
    adminRoleId
  );
}

export function voidInvoice(invoiceId: number, adminRoleId: number): Promise<Invoice> {
  return postJson<Record<string, never>, Invoice>(
    `/api/admin/invoices/${invoiceId}/void`,
    {},
    adminRoleId
  );
}

export function recordInvoicePayment(
  invoiceId: number,
  input: RecordInvoicePaymentInput,
  adminRoleId: number
): Promise<Invoice> {
  return postJson<RecordInvoicePaymentInput, Invoice>(
    `/api/admin/invoices/${invoiceId}/payments`,
    input,
    adminRoleId
  );
}
