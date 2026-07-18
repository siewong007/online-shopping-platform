import { fallbackCustomerPortalProfiles } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson, requestJson } from "../../../shared/api/http";
import {
  adminListPath,
  normalizePagedResponse,
  type AdminListParams,
  type PagedResponse
} from "../../../shared/api/pagination";
import type {
  CreateCustomerPortalProfileInput,
  CustomerLookupPayload,
  CustomerPortalProfile,
  UpdateCustomerPortalProfileInput
} from "../types";

export function fetchCustomerPortalProfiles(
  params: AdminListParams = {}
): Promise<PagedResponse<CustomerPortalProfile>> {
  return fetchJson<CustomerPortalProfile[] | PagedResponse<CustomerPortalProfile>>(
    adminListPath("/api/admin/customer-portal", params),
    fallbackCustomerPortalProfiles
  ).then(normalizePagedResponse);
}

export function lookupCustomer(email: string, orderId: number): Promise<CustomerLookupPayload> {
  return requestJson<CustomerLookupPayload>(
    `/api/customer-portal/lookup?email=${encodeURIComponent(email)}&order_id=${orderId}`
  );
}

export function createCustomerPortalProfile(
  input: CreateCustomerPortalProfileInput
): Promise<CustomerPortalProfile> {
  return postJson<CreateCustomerPortalProfileInput, CustomerPortalProfile>(
    "/api/admin/customer-portal",
    input
  );
}

export function updateCustomerPortalProfile(
  profileId: number,
  input: UpdateCustomerPortalProfileInput
): Promise<CustomerPortalProfile> {
  return putJson<UpdateCustomerPortalProfileInput, CustomerPortalProfile>(
    `/api/admin/customer-portal/${profileId}`,
    input
  );
}

export function deleteCustomerPortalProfile(profileId: number): Promise<void> {
  return deleteJson(`/api/admin/customer-portal/${profileId}`);
}
