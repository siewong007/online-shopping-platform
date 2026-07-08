import { fallbackSales, fallbackSalesSummary } from "../../../data/fallback";
import { fetchJson, putJson } from "../../../shared/api/http";
import {
  adminListPath,
  normalizePagedResponse,
  type AdminListParams,
  type PagedResponse
} from "../../../shared/api/pagination";
import type {
  SalesRecord,
  SalesSummaryPayload,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput
} from "../types";

export function fetchSales(params: AdminListParams = {}): Promise<PagedResponse<SalesRecord>> {
  return fetchJson<SalesRecord[] | PagedResponse<SalesRecord>>(
    adminListPath("/api/admin/sales", params),
    fallbackSales
  ).then(normalizePagedResponse);
}

export function fetchSalesSummary(): Promise<SalesSummaryPayload> {
  return fetchJson("/api/admin/sales/summary", fallbackSalesSummary);
}

export function updateSalesDetails(
  orderId: number,
  input: UpdateSalesDetailsInput
): Promise<SalesRecord> {
  return putJson<UpdateSalesDetailsInput, SalesRecord>(`/api/admin/sales/${orderId}`, input);
}

export function updateSalesStatus(
  orderId: number,
  input: UpdateSalesStatusInput
): Promise<SalesRecord> {
  return putJson<UpdateSalesStatusInput, SalesRecord>(
    `/api/admin/sales/${orderId}/status`,
    input
  );
}
