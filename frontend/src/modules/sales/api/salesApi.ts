import { fallbackSales, fallbackSalesSummary } from "../../../data/fallback";
import { fetchJson, putJson } from "../../../shared/api/http";
import type {
  SalesRecord,
  SalesSummaryPayload,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput
} from "../types";

export function fetchSales(): Promise<SalesRecord[]> {
  return fetchJson("/api/admin/sales", fallbackSales);
}

export function fetchSalesSummary(): Promise<SalesSummaryPayload> {
  return fetchJson("/api/admin/sales/summary", fallbackSalesSummary);
}

export function updateSalesDetails(
  orderId: number,
  input: UpdateSalesDetailsInput,
  adminRoleId: number
): Promise<SalesRecord> {
  return putJson<UpdateSalesDetailsInput, SalesRecord>(
    `/api/admin/sales/${orderId}`,
    input,
    adminRoleId
  );
}

export function updateSalesStatus(
  orderId: number,
  input: UpdateSalesStatusInput,
  adminRoleId: number
): Promise<SalesRecord> {
  return putJson<UpdateSalesStatusInput, SalesRecord>(
    `/api/admin/sales/${orderId}/status`,
    input,
    adminRoleId
  );
}
