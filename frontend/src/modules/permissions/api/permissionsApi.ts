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

export function createRole(input: CreateRoleInput): Promise<Role> {
  return postJson<CreateRoleInput, Role>("/api/admin/roles", input);
}

export function updateRole(roleId: number, input: UpdateRoleInput): Promise<Role> {
  return putJson<UpdateRoleInput, Role>(`/api/admin/roles/${roleId}`, input);
}

export function deleteRole(roleId: number): Promise<void> {
  return deleteJson(`/api/admin/roles/${roleId}`);
}

export function updateRolePermission(
  input: UpdateRolePagePermissionInput
): Promise<RolePagePermission> {
  return putJson<UpdateRolePagePermissionInput, RolePagePermission>(
    "/api/admin/role-permissions",
    input
  );
}
