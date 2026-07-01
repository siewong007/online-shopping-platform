import { fallbackPermissions } from "../../../data/fallback";
import { deleteJson, fetchJson, postJson, putJson } from "../../../shared/api/http";
import type {
  CreateRoleInput,
  PermissionsPayload,
  Role,
  RolePagePermission,
  UpdateRoleInput,
  UpdateRolePagePermissionInput
} from "../types";

export function fetchPermissions(): Promise<PermissionsPayload> {
  return fetchJson("/api/admin/permissions", fallbackPermissions);
}

export function createRole(input: CreateRoleInput, adminRoleId: number): Promise<Role> {
  return postJson<CreateRoleInput, Role>("/api/admin/roles", input, adminRoleId);
}

export function updateRole(roleId: number, input: UpdateRoleInput, adminRoleId: number): Promise<Role> {
  return putJson<UpdateRoleInput, Role>(`/api/admin/roles/${roleId}`, input, adminRoleId);
}

export function deleteRole(roleId: number, adminRoleId: number): Promise<void> {
  return deleteJson(`/api/admin/roles/${roleId}`, adminRoleId);
}

export function updateRolePermission(
  input: UpdateRolePagePermissionInput,
  adminRoleId: number
): Promise<RolePagePermission> {
  return putJson<UpdateRolePagePermissionInput, RolePagePermission>(
    "/api/admin/role-permissions",
    input,
    adminRoleId
  );
}
