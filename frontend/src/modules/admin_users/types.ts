export type { AdminUser } from "../auth/types";

export type CreateAdminUserInput = {
  username: string;
  display_name: string;
  password: string;
  role_id: number;
};

export type UpdateAdminUserProfileInput = {
  display_name: string;
  role_id: number;
};

export type SetAdminUserActiveInput = {
  is_active: boolean;
};

export type AdminResetPasswordInput = {
  new_password: string;
};

export type ChangeOwnPasswordInput = {
  current_password: string;
  new_password: string;
};
