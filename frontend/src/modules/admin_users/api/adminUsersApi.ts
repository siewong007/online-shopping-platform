import { fallbackAdminUsers } from "../../../data/fallback";
import { fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  AdminResetPasswordInput,
  AdminUser,
  ChangeOwnPasswordInput,
  CreateAdminUserInput,
  SetAdminUserActiveInput,
  UpdateAdminUserProfileInput
} from "../types";

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return fetchJson("/api/admin/users", fallbackAdminUsers);
}

export function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  return postJson<CreateAdminUserInput, AdminUser>("/api/admin/users", input);
}

export function updateAdminUserProfile(
  userId: number,
  input: UpdateAdminUserProfileInput
): Promise<AdminUser> {
  return putJson<UpdateAdminUserProfileInput, AdminUser>(`/api/admin/users/${userId}`, input);
}

export function setAdminUserActive(
  userId: number,
  input: SetAdminUserActiveInput
): Promise<AdminUser> {
  return putJson<SetAdminUserActiveInput, AdminUser>(`/api/admin/users/${userId}/status`, input);
}

export function resetAdminUserPassword(
  userId: number,
  input: AdminResetPasswordInput
): Promise<void> {
  return putJson<AdminResetPasswordInput, void>(`/api/admin/users/${userId}/password`, input);
}

export function changeOwnPassword(input: ChangeOwnPasswordInput): Promise<void> {
  return putJson<ChangeOwnPasswordInput, void>("/api/admin/me/password", input);
}
