import { PAGE_REGISTRY } from "../data/pageRegistry";
import type { RecordFormField } from "../shared/components/RecordModal";
import type {
  AdminAuthPayload,
  AdminMePayload,
  ChangeOwnPasswordInput,
  PermissionsPayload,
  RolePagePermission
} from "../types";

export type AdminAuthState =
  | "checking"
  | "unauthenticated"
  | "mfa-challenge"
  | "authenticated"
  | "demo";
export type AdminTab =
  | "overview"
  | "team-log"
  | "inventory"
  | "fulfillment"
  | "campaigns"
  | "catalog"
  | "customers"
  | "support"
  | "orders"
  | "payments"
  | "sales"
  | "invoices"
  | "settings"
  | "permissions";

export type PermissionAction = "create" | "read" | "update" | "delete";
export type AdminAuthSnapshot = AdminAuthPayload | AdminMePayload;

export const adminTabs: { tab: AdminTab; label: string; pageSlug: string }[] = [
  { tab: "overview", label: "Overview", pageSlug: "admin-overview" },
  { tab: "team-log", label: "Team Log", pageSlug: "admin-overview" },
  { tab: "inventory", label: "Inventory", pageSlug: "admin-inventory" },
  { tab: "fulfillment", label: "Fulfillment", pageSlug: "admin-fulfillment" },
  { tab: "campaigns", label: "Campaigns", pageSlug: "admin-campaigns" },
  { tab: "catalog", label: "Catalog", pageSlug: "admin-catalog" },
  { tab: "customers", label: "Customers", pageSlug: "admin-customers" },
  { tab: "support", label: "Support", pageSlug: "admin-support" },
  { tab: "orders", label: "Orders", pageSlug: "admin-orders" },
  { tab: "payments", label: "Payments", pageSlug: "admin-payments" },
  { tab: "sales", label: "Sales", pageSlug: "admin-sales" },
  { tab: "invoices", label: "Invoices", pageSlug: "admin-invoices" },
  { tab: "settings", label: "Settings", pageSlug: "admin-settings" },
  { tab: "permissions", label: "Permissions", pageSlug: "admin-permissions" }
];

export const changePasswordFields: RecordFormField<ChangeOwnPasswordInput>[] = [
  {
    name: "current_password",
    label: "Current password",
    type: "password",
    required: true
  },
  {
    name: "new_password",
    label: "New password",
    type: "password",
    required: true,
    minLength: 8
  }
];

export function emptyPermission(roleId: number, pageId: number): RolePagePermission {
  return {
    role_id: roleId,
    page_id: pageId,
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false
  };
}

export function getRolePermission(
  permissions: PermissionsPayload | null,
  roleId: number | null,
  pageSlug: string
): RolePagePermission | null {
  if (!permissions || roleId === null) {
    return null;
  }

  const role = permissions.roles.find((item) => item.id === roleId);
  const page = permissions.pages.find((item) => item.slug === pageSlug);

  if (!role || !page) {
    return null;
  }

  if (role.is_super_admin) {
    return {
      role_id: role.id,
      page_id: page.id,
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true
    };
  }

  return (
    permissions.permissions.find((item) => item.role_id === role.id && item.page_id === page.id) ??
    emptyPermission(role.id, page.id)
  );
}

export function permissionsFromAuth(auth: AdminAuthSnapshot): PermissionsPayload {
  return {
    roles: [auth.role],
    pages: PAGE_REGISTRY,
    permissions: auth.permissions
  };
}

export function canAccess(
  permissions: PermissionsPayload | null,
  roleId: number | null,
  pageSlug: string,
  action: PermissionAction
): boolean {
  const permission = getRolePermission(permissions, roleId, pageSlug);

  if (!permission) {
    return action === "read";
  }

  if (action === "create") {
    return permission.can_create;
  }

  if (action === "update") {
    return permission.can_update;
  }

  if (action === "delete") {
    return permission.can_delete;
  }

  return permission.can_read;
}

export function applyPermissionUpdate(
  payload: PermissionsPayload,
  permission: RolePagePermission
): PermissionsPayload {
  const existing = payload.permissions.some(
    (item) => item.role_id === permission.role_id && item.page_id === permission.page_id
  );

  return {
    ...payload,
    permissions: existing
      ? payload.permissions.map((item) =>
          item.role_id === permission.role_id && item.page_id === permission.page_id
            ? permission
            : item
        )
      : [...payload.permissions, permission]
  };
}
