import { requestJson } from "../../../shared/api/http";
import type {
  CustomerTransactionsPayload,
  CustomerTransactionsQueryParams,
  MembershipBenefitsPayload,
  MembershipPayload
} from "../types";

export function fetchMembership(): Promise<MembershipPayload> {
  return requestJson<MembershipPayload>("/api/customer-portal/me/membership", {}, "customer");
}

export function fetchBenefits(): Promise<MembershipBenefitsPayload> {
  return requestJson<MembershipBenefitsPayload>("/api/customer-portal/me/benefits", {}, "customer");
}

export function fetchTransactions(
  params: CustomerTransactionsQueryParams = {}
): Promise<CustomerTransactionsPayload> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  const queryString = query.toString();
  const path = queryString
    ? `/api/customer-portal/me/transactions?${queryString}`
    : "/api/customer-portal/me/transactions";

  return requestJson<CustomerTransactionsPayload>(path, {}, "customer");
}
