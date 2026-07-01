export type Role = {
  id: number;
  name: string;
  description: string;
  is_super_admin: boolean;
  created_at: string;
};

export type CreateRoleInput = {
  name: string;
  description: string;
};

export type UpdateRoleInput = {
  name: string;
  description: string;
};

export type PermissionPage = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type RolePagePermission = {
  role_id: number;
  page_id: number;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type UpdateRolePagePermissionInput = RolePagePermission;

export type PermissionsPayload = {
  roles: Role[];
  pages: PermissionPage[];
  permissions: RolePagePermission[];
};
