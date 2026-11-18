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
  "checking" | "unauthenticated" | "mfa-challenge" | "authenticated" | "demo";
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

export type AdminTabGroup = "Operations" | "Commerce" | "Catalog & Care" | "Administration";

export type ChangeOwnPasswordFormValues = ChangeOwnPasswordInput & {
  confirm_password: string;
};

export type PermissionAction = "create" | "read" | "update" | "delete";
export type AdminAuthSnapshot = AdminAuthPayload | AdminMePayload;

export const adminTabs: { tab: AdminTab; label: string; pageSlug: string; group: AdminTabGroup }[] =
  [
    { tab: "overview", label: "Overview", pageSlug: "admin-overview", group: "Operations" },
    {
      tab: "fulfillment",
      label: "Fulfillment",
      pageSlug: "admin-fulfillment",
      group: "Operations"
    },
    { tab: "inventory", label: "Inventory", pageSlug: "admin-inventory", group: "Operations" },
    { tab: "team-log", label: "Team Log", pageSlug: "admin-overview", group: "Operations" },
    { tab: "orders", label: "Orders", pageSlug: "admin-orders", group: "Commerce" },
    { tab: "sales", label: "Sales", pageSlug: "admin-sales", group: "Commerce" },
    { tab: "payments", label: "Payments", pageSlug: "admin-payments", group: "Commerce" },
    { tab: "invoices", label: "Invoices", pageSlug: "admin-invoices", group: "Commerce" },
    { tab: "catalog", label: "Catalog", pageSlug: "admin-catalog", group: "Catalog & Care" },
    { tab: "campaigns", label: "Campaigns", pageSlug: "admin-campaigns", group: "Catalog & Care" },
    { tab: "customers", label: "Customers", pageSlug: "admin-customers", group: "Catalog & Care" },
    { tab: "support", label: "Support", pageSlug: "admin-support", group: "Catalog & Care" },
    { tab: "settings", label: "Settings", pageSlug: "admin-settings", group: "Administration" },
    {
      tab: "permissions",
      label: "Permissions",
      pageSlug: "admin-permissions",
      group: "Administration"
    }
  ];

export const changePasswordFields: RecordFormField<ChangeOwnPasswordFormValues>[] = [
  {
    name: "current_password",
    label: "Current password",
    type: "password",
    autoComplete: "current-password",
    required: true
  },
  {
    name: "new_password",
    label: "New password",
    type: "password",
    autoComplete: "new-password",
    required: true,
    minLength: 8,
    helpText: "Minimum 8 characters."
  },
  {
    name: "confirm_password",
    label: "Confirm new password",
    type: "password",
    autoComplete: "new-password",
    required: true,
    validate: (value, values) => (value !== values.new_password ? "Passwords do not match." : null)
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
