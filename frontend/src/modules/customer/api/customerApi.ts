import { fallbackCustomerPortalProfiles } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  CreateCustomerPortalProfileInput,
  CustomerPortalProfile,
  UpdateCustomerPortalProfileInput
} from "../types";

export function fetchCustomerPortalProfiles(): Promise<CustomerPortalProfile[]> {
  return fetchJson("/api/admin/customer-portal", fallbackCustomerPortalProfiles);
}

export function createCustomerPortalProfile(
  input: CreateCustomerPortalProfileInput,
  adminRoleId: number
): Promise<CustomerPortalProfile> {
  return postJson<CreateCustomerPortalProfileInput, CustomerPortalProfile>(
    "/api/admin/customer-portal",
    input,
    adminRoleId
  );
}

export function updateCustomerPortalProfile(
  profileId: number,
  input: UpdateCustomerPortalProfileInput,
  adminRoleId: number
): Promise<CustomerPortalProfile> {
  return putJson<UpdateCustomerPortalProfileInput, CustomerPortalProfile>(
    `/api/admin/customer-portal/${profileId}`,
    input,
    adminRoleId
  );
}

export function deleteCustomerPortalProfile(profileId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/customer-portal/${profileId}`, adminRoleId);
}
