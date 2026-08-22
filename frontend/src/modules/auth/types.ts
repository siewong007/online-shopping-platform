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

/// Untagged server response: a full payload on plain sign-ins, or an MFA challenge when the
/// account has an enrolled authenticator.
export type AdminLoginResponse = AdminAuthPayload | AdminMfaChallenge;

export type AdminMfaChallenge = {
  mfa_required: true;
  challenge_token: string;
};

export type AdminMfaEnrollmentStart = {
  otpauth_url: string;
  secret_base32: string;
};

export type AdminMfaRecoveryCodes = {
  recovery_codes: string[];
};
