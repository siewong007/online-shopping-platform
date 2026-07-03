import { fallbackCustomerPortalProfiles } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson, requestJson } from "../../../shared/api/http";
import type {
  CreateCustomerPortalProfileInput,
  CustomerLookupPayload,
  CustomerPortalProfile,
  UpdateCustomerPortalProfileInput
} from "../types";

export function fetchCustomerPortalProfiles(): Promise<CustomerPortalProfile[]> {
  return fetchJson("/api/admin/customer-portal", fallbackCustomerPortalProfiles);
}

export function lookupCustomer(email: string): Promise<CustomerLookupPayload> {
  return requestJson<CustomerLookupPayload>(
    `/api/customer-portal/lookup?email=${encodeURIComponent(email)}`
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
