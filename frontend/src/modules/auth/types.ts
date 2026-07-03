import type { Role, RolePagePermission } from "../permissions/types";

export type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminLoginInput = {
  username: string;
  password: string;
};

export type AdminAuthPayload = {
  token: string;
  user: AdminUser;
  role: Role;
  permissions: RolePagePermission[];
};

export type AdminMePayload = {
  user: AdminUser;
  role: Role;
  permissions: RolePagePermission[];
};
