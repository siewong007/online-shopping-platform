import { type FormEvent, startTransition, useEffect, useRef, useState } from "react";

import {
  changeOwnPassword as changeOwnPasswordRequest,
  checkout as checkoutRequest,
  createAdminOrder as createAdminOrderRequest,
  createAdminUser as createAdminUserRequest,
  createCategory as createCategoryRequest,
  createCustomerPortalProfile as createCustomerPortalProfileRequest,
  createInvoiceFromOrder as createInvoiceFromOrderRequest,
  createPayment as createPaymentRequest,
  createProduct as createProductRequest,
  createRole as createRoleRequest,
  deleteAdminOrder as deleteAdminOrderRequest,
  deleteCategory as deleteCategoryRequest,
  deleteCustomerPortalProfile as deleteCustomerPortalProfileRequest,
  deletePayment as deletePaymentRequest,
  AUDIT_EVENTS_PAGE_SIZE,
  deleteProduct as deleteProductRequest,
  deleteRole as deleteRoleRequest,
  exportAutoCountInvoices as exportAutoCountInvoicesRequest,
  fetchAdminCatalog,
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAuditEvents,
  fetchCustomerPortalProfiles,
  fetchCustomerPortalBenefits,
  fetchCustomerPortalMembership,
  fetchCustomerPortalTransactions,
  fetchCustomerSessions,
  fetchInvoices,
  fetchMe,
  fetchOrders,
  fetchPayments,
  fetchPermissions,
  fetchSales,
  fetchSalesSummary,
  fetchStorefront,
  fetchCustomerMe,
  fetchSystemSettings,
  login as loginRequest,
  loginCustomer,
  logoutCustomer,
  logoutCustomerOtherSessions,
  logoutCustomerSession,
  lookupCustomer as lookupCustomerRequest,
  logout as logoutRequest,
  registerCustomer,
  recordInvoicePayment as recordInvoicePaymentRequest,
  resetAdminUserPassword as resetAdminUserPasswordRequest,
  setAdminUserActive as setAdminUserActiveRequest,
  supplierSync,
  updateAdminOrder as updateAdminOrderRequest,
  updateAdminUserProfile as updateAdminUserProfileRequest,
  updateCategory as updateCategoryRequest,
  updateCustomerPortalProfile as updateCustomerPortalProfileRequest,
  updateInvoiceBilling as updateInvoiceBillingRequest,
  updatePayment as updatePaymentRequest,
  updateProduct as updateProductRequest,
  updateOrderFulfillment as updateOrderFulfillmentRequest,
  updateRole as updateRoleRequest,
  updateRolePermission as updateRolePermissionRequest,
  updateSalesDetails as updateSalesDetailsRequest,
  updateSalesStatus as updateSalesStatusRequest,
  updateSystemSetting as updateSystemSettingRequest,
  voidInvoice as voidInvoiceRequest
} from "./lib/api";
import { LangToggle, useI18n } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";
import { TeamPanel } from "./modules/admin_users/components/TeamPanel";
import { AdminLoginScreen } from "./modules/auth/components/AdminLoginScreen";
import { CatalogPanel } from "./modules/catalog/components/CatalogPanel";
import { OperationsConsole } from "./modules/dashboard/components/OperationsConsole";
import { LandingView } from "./modules/landing/LandingView";
import { InvoicesPanel } from "./modules/invoices/components/InvoicesPanel";
import {
  createPromotion as createPromotionRequest,
  createVoucher as createVoucherRequest,
  deletePromotion as deletePromotionRequest,
  deleteVoucher as deleteVoucherRequest,
  fetchPublicOffers,
  fetchPromotions,
  fetchVouchers,
  updatePromotion as updatePromotionRequest,
  updateVoucher as updateVoucherRequest
} from "./modules/offers/api/offersApi";
import { OfferManagementPanel } from "./modules/offers/components/OfferManagementPanel";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  Promotion,
  PublicOffersPayload,
  UpdatePromotionInput,
  UpdateVoucherInput,
  Voucher
} from "./modules/offers/types";
import { quoteCheckout } from "./modules/orders/api/orderApi";
import { OrderControlPanel } from "./modules/orders/components/OrderControlPanel";
import type { CheckoutQuote } from "./modules/orders/types";
import { PaymentManagementPanel } from "./modules/payments/components/PaymentManagementPanel";
import { PermissionsPanel } from "./modules/permissions/components/PermissionsPanel";
import { SalesPanel } from "./modules/sales/components/SalesPanel";
import { SettingsPanel } from "./modules/settings/components/SettingsPanel";
import { SupportChatWidget } from "./modules/support/components/SupportChatWidget";
import { SupportInboxPanel } from "./modules/support/components/SupportInboxPanel";
import {
  fallbackCustomerPortalBenefits,
  fallbackCustomerPortalMembership,
  fallbackCustomerPortalTransactions,
  fallbackPermissions
} from "./data/fallback";
import {
  ApiError,
  getAuthToken,
  getCustomerAuthToken,
  setAuthToken,
  setCustomerAuthToken,
  setOnUnauthorized
} from "./shared/api/http";
import type { PagedResponse } from "./shared/api/pagination";
import { ManagementTable } from "./shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "./shared/components/RecordModal";
import { StatusPage } from "./shared/components/StatusPage";
import { currencyFromCents, formatOrderDate, formatRelativeTime } from "./shared/formatters";
import { normalizeError, useNotifications } from "./shared/notifications";
import type {
  ActivityItem,
  AdminAuthPayload,
  AdminCatalogPayload,
  AdminDashboardPayload,
  AdminLoginInput,
  AdminMePayload,
  AdminResetPasswordInput,
  AdminUser,
  AutoCountExportInput,
  AuditEvent,
  CartItem,
  Category,
  ChangeOwnPasswordInput,
  CreateAdminUserInput,
  CreateCategoryInput,
  CreateCustomerPortalProfileInput,
  CreateInvoiceFromOrderInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateProductInput,
  CreateRoleInput,
  CustomerLoginInput,
  CustomerLookupPayload,
  CustomerMePayload,
  CustomerPortalProfile,
  CustomerRegisterInput,
  CustomerSession,
  CustomerTransactionsPayload,
  FulfillmentMethod,
  FulfillmentStatus,
  Invoice,
  MembershipBenefitsPayload,
  MembershipPayload,
  Order,
  Payment,
  PermissionsPayload,
  Product,
  RecordInvoicePaymentInput,
  Role,
  RolePagePermission,
  SalesRecord,
  SalesSummaryPayload,
  SetAdminUserActiveInput,
  StorefrontPayload,
  StorefrontSort,
  SystemSetting,
  UpdateAdminUserProfileInput,
  UpdateCategoryInput,
  UpdateCustomerPortalProfileInput,
  UpdateInvoiceBillingInput,
  UpdatePaymentInput,
  UpdateProductInput,
  UpdateOrderFulfillmentInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput,
  UpdateSystemSettingInput
} from "./types";

const CART_STORAGE_KEY = "depot-cart";
const ACCOUNT_EMAIL_STORAGE_KEY = "depot-account-email";
const ACCOUNT_ORDER_ID_STORAGE_KEY = "depot-account-order-id";

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

type View = "landing" | "store" | "admin" | "forbidden" | "not-found";

function viewFromPath(pathname: string): View {
  if (pathname === "/admin") return "admin";
  if (pathname === "/shop") return "store";
  if (pathname === "/forbidden") return "forbidden";
  if (pathname === "/") return "landing";
  return "not-found";
}
type AdminAuthState = "checking" | "unauthenticated" | "authenticated" | "demo";
type AdminTab =
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

type PermissionAction = "create" | "read" | "update" | "delete";
type AdminAuthSnapshot = AdminAuthPayload | AdminMePayload;

const adminTabs: { tab: AdminTab; label: string; pageSlug: string }[] = [
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

const changePasswordFields: RecordFormField<ChangeOwnPasswordInput>[] = [
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

const membershipTiers = ["Bronze", "Silver", "Gold", "Pro Xtra", "VIP"];

const departmentMenu: { key: TranslationKey }[] = [
  { key: "shop.dept.all" },
  { key: "shop.dept.deals" },
  { key: "shop.dept.power" },
  { key: "shop.dept.paint" },
  { key: "shop.dept.building" },
  { key: "shop.dept.bath" },
  { key: "shop.dept.kitchen" },
  { key: "shop.dept.electrical" },
  { key: "shop.dept.lighting" },
  { key: "shop.dept.hand" },
  { key: "shop.dept.services" },
  { key: "shop.dept.pro" }
];

const seasonalTags = [
  "Genuine Brands",
  "Fast Counter Service",
  "This Month's Picks",
  "Power Tools",
  "Nippon Paint",
  "Building Materials",
  "Bathroom Fittings",
  "Home Appliances"
];

const quickServiceCalls: { key: TranslationKey; detail: TranslationKey }[] = [
  { key: "shop.svc.1.k", detail: "shop.svc.1.v" },
  { key: "shop.svc.2.k", detail: "shop.svc.2.v" },
  { key: "shop.svc.3.k", detail: "shop.svc.3.v" }
];

function readStoredAccountEmail(): string {
  try {
    return window.localStorage.getItem(ACCOUNT_EMAIL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberAccountEmail(email: string) {
  try {
    window.localStorage.setItem(ACCOUNT_EMAIL_STORAGE_KEY, email);
  } catch {
    return;
  }
}

function readStoredAccountOrderId(): number | null {
  try {
    const stored = window.localStorage.getItem(ACCOUNT_ORDER_ID_STORAGE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function rememberAccountOrderId(orderId: number) {
  try {
    window.localStorage.setItem(ACCOUNT_ORDER_ID_STORAGE_KEY, String(orderId));
  } catch {
    return;
  }
}

function appendUniqueByKey<T>(
  current: T[],
  next: T[],
  keyFor: (item: T) => number | string
): T[] {
  const seen = new Set(current.map(keyFor));
  const merged = [...current];

  for (const item of next) {
    const key = keyFor(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

function emptyPermission(roleId: number, pageId: number): RolePagePermission {
  return {
    role_id: roleId,
    page_id: pageId,
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false
  };
}

function getRolePermission(
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

function permissionsFromAuth(auth: AdminAuthSnapshot): PermissionsPayload {
  return {
    roles: [auth.role],
    pages: fallbackPermissions.pages,
    permissions: auth.permissions
  };
}

type CustomerPortalFormState = {
  customer_name: string;
  customer_email: string;
  membership_tier: string;
  points_balance: string;
  lifetime_purchase: string;
  total_orders: string;
};

const emptyCustomerPortalForm: CustomerPortalFormState = {
  customer_name: "",
  customer_email: "",
  membership_tier: membershipTiers[0],
  points_balance: "0",
  lifetime_purchase: "0.00",
  total_orders: "0"
};

function customerPortalFormFromProfile(profile: CustomerPortalProfile): CustomerPortalFormState {
  return {
    customer_name: profile.customer_name,
    customer_email: profile.customer_email,
    membership_tier: profile.membership_tier,
    points_balance: String(profile.points_balance),
    lifetime_purchase: (profile.lifetime_purchase_cents / 100).toFixed(2),
    total_orders: String(profile.total_orders)
  };
}

function customerPortalInputFromForm(
  form: CustomerPortalFormState
): CreateCustomerPortalProfileInput {
  const pointsBalance = Number(form.points_balance);
  const lifetimePurchaseCents = Math.round(Number(form.lifetime_purchase) * 100);
  const totalOrders = Number(form.total_orders);

  if (!Number.isInteger(pointsBalance) || pointsBalance < 0) {
    throw new Error("Enter a whole number of points.");
  }

  if (!Number.isFinite(lifetimePurchaseCents) || lifetimePurchaseCents < 0) {
    throw new Error("Enter a valid lifetime purchase value.");
  }

  if (!Number.isInteger(totalOrders) || totalOrders < 0) {
    throw new Error("Enter a whole number of orders.");
  }

  return {
    customer_name: form.customer_name.trim(),
    customer_email: form.customer_email.trim(),
    membership_tier: form.membership_tier,
    points_balance: pointsBalance,
    lifetime_purchase_cents: lifetimePurchaseCents,
    total_orders: totalOrders
  };
}

const customerPortalFields: RecordFormField<CustomerPortalFormState>[] = [
  {
    name: "customer_name",
    label: "Customer name",
    required: true,
    minLength: 2,
    placeholder: "Dana Whitfield"
  },
  {
    name: "customer_email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "dana@example.com"
  },
  {
    name: "membership_tier",
    label: "Membership",
    type: "select",
    options: membershipTiers.map((tier) => ({ label: tier, value: tier }))
  },
  {
    name: "points_balance",
    label: "Points",
    type: "number",
    required: true,
    min: 0,
    step: 1,
    validate: (value) =>
      Number.isInteger(Number(value)) ? null : "Points must be a whole number."
  },
  {
    name: "lifetime_purchase",
    label: "Purchase value",
    type: "number",
    required: true,
    min: 0,
    step: "0.01"
  },
  {
    name: "total_orders",
    label: "Orders",
    type: "number",
    required: true,
    min: 0,
    step: 1,
    validate: (value) =>
      Number.isInteger(Number(value)) ? null : "Orders must be a whole number."
  }
];

type CustomerPortalPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onCreateCustomerPortalProfile: (
    input: CreateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onLoadMore: () => void;
  onUpdateCustomerPortalProfile: (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  orders: Order[];
  profiles: CustomerPortalProfile[];
};

function CustomerPortalPanel({
  canCreate,
  canDelete,
  canUpdate,
  hasMore,
  isLoadingMore,
  onCreateCustomerPortalProfile,
  onDeleteCustomerPortalProfile,
  onLoadMore,
  onUpdateCustomerPortalProfile,
  orders,
  profiles
}: CustomerPortalPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [createForm, setCreateForm] = useState<CustomerPortalFormState>(emptyCustomerPortalForm);
  const [editForm, setEditForm] = useState<CustomerPortalFormState | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState<number | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<number | null>(null);

  const totalPoints = profiles.reduce((sum, profile) => sum + profile.points_balance, 0);
  const totalPurchaseCents = profiles.reduce(
    (sum, profile) => sum + profile.lifetime_purchase_cents,
    0
  );
  const totalOrders = profiles.reduce((sum, profile) => sum + profile.total_orders, 0);

  const handleCreate = async () => {
    if (!canCreate) {
      notify({ severity: "error", title: "Customer not created", message: "The active role cannot create customer profiles.", scope: "customer-profiles", dedupeKey: "customer-profiles:create:permission" });
      return;
    }

    setIsCreating(true);

    try {
      const profile = await onCreateCustomerPortalProfile(customerPortalInputFromForm(createForm));

      setCreateForm(emptyCustomerPortalForm);
      setIsCreateOpen(false);
      notify({ severity: "success", title: "Customer created", message: `${profile.customer_name} was created successfully.`, scope: "customer-profiles", dedupeKey: `customer-profiles:${profile.id}:create:success` });
    } catch (error) {
      notifyError(error, { operation: "create customer profile", scope: "customer-profiles", dedupeKey: "customer-profiles:create:error" });
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (profile: CustomerPortalProfile) => {
    setEditingProfileId(profile.id);
    setEditForm(customerPortalFormFromProfile(profile));
  };

  const handleUpdate = async () => {
    if (!editForm || editingProfileId === null) {
      return;
    }

    if (!canUpdate) {
      notify({ severity: "error", title: "Customer not updated", message: "The active role cannot update customer profiles.", scope: "customer-profiles", dedupeKey: "customer-profiles:update:permission" });
      return;
    }

    setSavingProfileId(editingProfileId);

    try {
      const profile = await onUpdateCustomerPortalProfile(
        editingProfileId,
        customerPortalInputFromForm(editForm)
      );

      setEditingProfileId(null);
      setEditForm(null);
      notify({ severity: "success", title: "Customer updated", message: `${profile.customer_name} was updated successfully.`, scope: "customer-profiles", dedupeKey: `customer-profiles:${profile.id}:update:success` });
    } catch (error) {
      notifyError(error, { operation: "update customer profile", scope: "customer-profiles", dedupeKey: `customer-profiles:${editingProfileId}:update:error` });
    } finally {
      setSavingProfileId(null);
    }
  };

  const handleDelete = async (profile: CustomerPortalProfile) => {
    if (!canDelete) {
      notify({ severity: "error", title: "Customer not deleted", message: "The active role cannot delete customer profiles.", scope: "customer-profiles", dedupeKey: "customer-profiles:delete:permission" });
      return;
    }

    if (!window.confirm(`Delete ${profile.customer_name}'s customer portal profile?`)) {
      return;
    }

    setDeletingProfileId(profile.id);

    try {
      await onDeleteCustomerPortalProfile(profile.id);
      notify({ severity: "success", title: "Customer deleted", message: `${profile.customer_name} was deleted successfully.`, scope: "customer-profiles", dedupeKey: `customer-profiles:${profile.id}:delete:success` });
    } catch (error) {
      notifyError(error, { operation: "delete customer profile", scope: "customer-profiles", dedupeKey: `customer-profiles:${profile.id}:delete:error` });
    } finally {
      setDeletingProfileId(null);
    }
  };

  const profileColumns = [
    {
      key: "name",
      label: "Customer",
      sortValue: (profile: CustomerPortalProfile) => profile.customer_name,
      render: (profile: CustomerPortalProfile) => (
        <div className="table-cell-main">
          <strong>{profile.customer_name}</strong>
          <span>{profile.customer_email}</span>
        </div>
      )
    },
    {
      key: "tier",
      label: "Tier",
      sortValue: (profile: CustomerPortalProfile) => profile.membership_tier,
      render: (profile: CustomerPortalProfile) => profile.membership_tier
    },
    {
      key: "points",
      label: "Points",
      align: "right" as const,
      sortValue: (profile: CustomerPortalProfile) => profile.points_balance,
      render: (profile: CustomerPortalProfile) => profile.points_balance.toLocaleString()
    },
    {
      key: "lifetime",
      label: "Lifetime",
      align: "right" as const,
      sortValue: (profile: CustomerPortalProfile) => profile.lifetime_purchase_cents,
      render: (profile: CustomerPortalProfile) =>
        currencyFromCents(profile.lifetime_purchase_cents)
    },
    {
      key: "orders",
      label: "Orders",
      align: "right" as const,
      sortValue: (profile: CustomerPortalProfile) => profile.total_orders,
      render: (profile: CustomerPortalProfile) => profile.total_orders.toLocaleString()
    },
    {
      key: "last_purchase",
      label: "Last purchase",
      sortValue: (profile: CustomerPortalProfile) => profile.last_purchase_at ?? "",
      render: (profile: CustomerPortalProfile) =>
        profile.last_purchase_at ? formatOrderDate(profile.last_purchase_at) : "No purchases"
    },
    {
      key: "linked_orders",
      label: "Linked",
      align: "right" as const,
      sortValue: (profile: CustomerPortalProfile) =>
        orders.filter(
          (order) => order.customer_email.toLowerCase() === profile.customer_email.toLowerCase()
        ).length,
      render: (profile: CustomerPortalProfile) => {
        const linkedOrders = orders.filter(
          (order) => order.customer_email.toLowerCase() === profile.customer_email.toLowerCase()
        );

        return linkedOrders.length.toLocaleString();
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (profile: CustomerPortalProfile) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => startEditing(profile)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button danger-button table-action"
            disabled={!canDelete || deletingProfileId === profile.id}
            onClick={() => void handleDelete(profile)}
            type="button"
          >
            {deletingProfileId === profile.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  const editingProfile =
    editingProfileId === null
      ? null
      : profiles.find((profile) => profile.id === editingProfileId) ?? null;
  const isEditOpen = Boolean(editingProfile && editForm);
  const closeEdit = () => {
    setEditingProfileId(null);
    setEditForm(null);
  };

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Customer portal</p>
          <h3>Membership, points and purchase controls</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
          {canCreate || canUpdate || canDelete ? "Writable" : "Read only"}
        </span>
      </div>

      <div className="metric-grid customer-summary-grid">
        <article className="metric-card">
          <p>Portal customers</p>
          <strong>{profiles.length}</strong>
          <span>Tracked accounts</span>
        </article>
        <article className="metric-card">
          <p>Points issued</p>
          <strong>{totalPoints.toLocaleString()}</strong>
          <span>Across memberships</span>
        </article>
        <article className="metric-card">
          <p>Recorded purchases</p>
          <strong>{currencyFromCents(totalPurchaseCents)}</strong>
          <span>{totalOrders.toLocaleString()} total orders</span>
        </article>
      </div>

      <article className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Customer table</p>
            <h3>Portal profile roster</h3>
          </div>
          <div className="admin-actions">
            <span className="status-pill">{profiles.length} rows</span>
            <button
              className="solid-button"
              disabled={!canCreate}
              onClick={() => {
                setCreateForm(emptyCustomerPortalForm);
                setIsCreateOpen(true);
              }}
              type="button"
            >
              Create Customer
            </button>
          </div>
        </div>

        <ManagementTable
          columns={profileColumns}
          emptyMessage="No customer profiles have been created yet."
          getRowKey={(profile) => profile.id}
          hasMore={hasMore}
          initialSortKey="name"
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          rows={profiles}
          tableLabel="Customer profile management table"
        />
      </article>

      <RecordModal
        eyebrow="New customer"
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
        }}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Create portal profile"
      >
        <RecordForm
          disabled={!canCreate}
          fields={customerPortalFields}
          isSubmitting={isCreating}
          onCancel={() => {
            setIsCreateOpen(false);
          }}
          onChange={setCreateForm}
          onSubmit={() => void handleCreate()}
          submitLabel="Create Customer"
          values={createForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow="Editing customer"
        isOpen={isEditOpen}
        onClose={closeEdit}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title={editingProfile?.customer_name ?? "Customer"}
      >
        {editForm && editingProfile ? (
          <RecordForm
            disabled={!canUpdate}
            fields={customerPortalFields}
            isSubmitting={savingProfileId === editingProfile.id}
            onCancel={closeEdit}
            onChange={setEditForm}
            onSubmit={() => void handleUpdate()}
            submitLabel="Save Customer"
            values={editForm}
          />
        ) : null}
      </RecordModal>
    </section>
  );
}

type CustomerPortalFormFieldsProps = {
  disabled: boolean;
  form: CustomerPortalFormState;
  onChange: (form: CustomerPortalFormState) => void;
};

function CustomerPortalFormFields({ disabled, form, onChange }: CustomerPortalFormFieldsProps) {
  return (
    <div className="admin-form-grid">
      <label className="admin-field">
        Customer name
        <input
          disabled={disabled}
          onChange={(event) => onChange({ ...form, customer_name: event.target.value })}
          required
          value={form.customer_name}
        />
      </label>
      <label className="admin-field">
        Email
        <input
          disabled={disabled}
          onChange={(event) => onChange({ ...form, customer_email: event.target.value })}
          required
          type="email"
          value={form.customer_email}
        />
      </label>
      <label className="admin-field">
        Membership
        <select
          disabled={disabled}
          onChange={(event) => onChange({ ...form, membership_tier: event.target.value })}
          value={form.membership_tier}
        >
          {membershipTiers.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field">
        Points
        <input
          disabled={disabled}
          min="0"
          onChange={(event) => onChange({ ...form, points_balance: event.target.value })}
          required
          step="1"
          type="number"
          value={form.points_balance}
        />
      </label>
      <label className="admin-field">
        Purchase value
        <input
          disabled={disabled}
          min="0"
          onChange={(event) => onChange({ ...form, lifetime_purchase: event.target.value })}
          required
          step="0.01"
          type="number"
          value={form.lifetime_purchase}
        />
      </label>
      <label className="admin-field">
        Orders
        <input
          disabled={disabled}
          min="0"
          onChange={(event) => onChange({ ...form, total_orders: event.target.value })}
          required
          step="1"
          type="number"
          value={form.total_orders}
        />
      </label>
    </div>
  );
}

function canAccess(
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

function applyPermissionUpdate(
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

function fulfillmentLabel(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function auditEventToActivityItem(event: AuditEvent): ActivityItem {
  const action = fulfillmentLabel(event.action).toLowerCase();
  const entity = fulfillmentLabel(event.entity_type).toLowerCase();
  const summary = `${event.actor} ${action} ${entity}`.trim();

  return {
    happened_at: formatRelativeTime(event.happened_at),
    detail: event.detail ? `${summary} — ${event.detail}` : summary
  };
}

function priceInputToCents(value: string): number | null {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function EkowayMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ekoway-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <img src="/ekoway/ekoway-logo.jpeg" alt="" />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [storefront, setStorefront] = useState<StorefrontPayload | null>(null);
  const [publicOffers, setPublicOffers] = useState<PublicOffersPayload | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [minPriceCents, setMinPriceCents] = useState<number | null>(null);
  const [maxPriceCents, setMaxPriceCents] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<StorefrontSort>("featured");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [oldestAuditEventId, setOldestAuditEventId] = useState<number | null>(null);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersNextCursor, setOrdersNextCursor] = useState<number | null>(null);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [salesNextCursor, setSalesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreSales, setIsLoadingMoreSales] = useState(false);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryPayload | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesNextCursor, setInvoicesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreInvoices, setIsLoadingMoreInvoices] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerPortalProfile[]>([]);
  const [customerProfilesNextCursor, setCustomerProfilesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreCustomerProfiles, setIsLoadingMoreCustomerProfiles] = useState(false);
  const [customerAccountEmail, setCustomerAccountEmail] = useState(readStoredAccountEmail);
  const [customerAccountOrderId, setCustomerAccountOrderId] = useState(readStoredAccountOrderId);
  const [permissions, setPermissions] = useState<PermissionsPayload | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);
  const [adminAuth, setAdminAuth] = useState<AdminAuthState>(() =>
    getAuthToken() ? "checking" : "unauthenticated"
  );
  const [currentAdmin, setCurrentAdmin] = useState<AdminMePayload | null>(null);
  const [adminCatalog, setAdminCatalog] = useState<AdminCatalogPayload | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const isInitialStorefrontFilter = useRef(true);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const { t } = useI18n();

  useEffect(() => {
    document.title =
      view === "landing"
        ? "Ekoway Hardware — 永光五金 · Sibu, Sarawak"
        : view === "store"
          ? "Ekoway Hardware — Shop Online"
          : view === "admin"
            ? "Ekoway Hardware — OPT Console"
            : view === "forbidden"
              ? "Access denied — Ekoway Hardware"
              : "Page not found — Ekoway Hardware";
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    void fetchStorefront().then(setStorefront);
  }, []);

  useEffect(() => {
    void fetchPublicOffers().then(setPublicOffers);
  }, []);

  useEffect(() => {
    if (isInitialStorefrontFilter.current) {
      isInitialStorefrontFilter.current = false;
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(() => {
      void fetchStorefront({
        q: searchTerm,
        category: selectedCategory,
        minPriceCents: minPriceCents ?? undefined,
        maxPriceCents: maxPriceCents ?? undefined,
        sort: sortOption
      }).then((payload) => {
        if (!cancelled) {
          setStorefront(payload);
        }
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchTerm, selectedCategory, minPriceCents, maxPriceCents, sortOption]);

  useEffect(() => {
    const onPopState = () => {
      setView(viewFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = storefront?.products ?? [];

  const openView = (nextView: Extract<View, "landing" | "store" | "admin">) => {
    startTransition(() => {
      const nextPath = nextView === "admin" ? "/admin" : nextView === "store" ? "/shop" : "/";
      window.history.pushState({}, "", nextPath);
      setView(nextView);
    });
  };

  const applyAdminData = ({
    adminUsersData,
    auditEventsData,
    catalogData,
    dashboardData,
    invoicesData,
    ordersData,
    paymentsData,
    permissionsData,
    promotionsData,
    salesData,
    salesSummaryData,
    systemSettingsData,
    customerProfileData,
    vouchersData
  }: {
    adminUsersData: AdminUser[];
    auditEventsData: AuditEvent[];
    catalogData: AdminCatalogPayload;
    dashboardData: AdminDashboardPayload;
    invoicesData: PagedResponse<Invoice>;
    ordersData: PagedResponse<Order>;
    paymentsData: Payment[];
    permissionsData: PermissionsPayload;
    promotionsData: Promotion[];
    salesData: PagedResponse<SalesRecord>;
    salesSummaryData: SalesSummaryPayload;
    systemSettingsData: SystemSetting[];
    customerProfileData: PagedResponse<CustomerPortalProfile>;
    vouchersData: Voucher[];
  }) => {
    setAdminUsers(adminUsersData);
    setAdminCatalog(catalogData);
    setDashboard(dashboardData);
    setPromotions(promotionsData);
    setVouchers(vouchersData);
    setActivityFeed(auditEventsData.map(auditEventToActivityItem));
    setOldestAuditEventId(
      auditEventsData.length > 0
        ? auditEventsData[auditEventsData.length - 1].id
        : null
    );
    setHasMoreActivity(auditEventsData.length >= AUDIT_EVENTS_PAGE_SIZE);
    setOrders(ordersData.items);
    setOrdersNextCursor(ordersData.next_cursor);
    setPayments(paymentsData);
    setSales(salesData.items);
    setSalesNextCursor(salesData.next_cursor);
    setSalesSummary(salesSummaryData);
    setInvoices(invoicesData.items);
    setInvoicesNextCursor(invoicesData.next_cursor);
    setSystemSettings(systemSettingsData);
    setCustomerProfiles(customerProfileData.items);
    setCustomerProfilesNextCursor(customerProfileData.next_cursor);
    setPermissions(permissionsData);
  };

  const loadAdminData = async (auth: AdminAuthSnapshot) => {
    const ownPermissions = permissionsFromAuth(auth);
    const roleId = auth.role.id;
    const canReadPermissionMatrix = canAccess(
      ownPermissions,
      roleId,
      "admin-permissions",
      "read"
    );

    setCurrentAdmin({
      user: auth.user,
      role: auth.role,
      permissions: auth.permissions
    });
    setPermissions(ownPermissions);
    setActiveRoleId(roleId);

    const [
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchPromotions(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      fetchVouchers(),
      canReadPermissionMatrix ? fetchPermissions() : Promise.resolve(ownPermissions)
    ]);

    applyAdminData({
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    });
  };

  const loadDemoAdminData = async () => {
    const [
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchPromotions(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      fetchVouchers()
    ]);

    setCurrentAdmin(null);
    setActiveRoleId(null);
    applyAdminData({
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData: fallbackPermissions
    });
  };

  const loadMoreOrders = async () => {
    if (ordersNextCursor === null || isLoadingMoreOrders) {
      return;
    }

    setIsLoadingMoreOrders(true);
    try {
      const page = await fetchOrders({ before: ordersNextCursor });
      setOrders((current) => appendUniqueByKey(current, page.items, (order) => order.id));
      setOrdersNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreOrders(false);
    }
  };

  const loadMoreSales = async () => {
    if (salesNextCursor === null || isLoadingMoreSales) {
      return;
    }

    setIsLoadingMoreSales(true);
    try {
      const page = await fetchSales({ before: salesNextCursor });
      setSales((current) => appendUniqueByKey(current, page.items, (sale) => sale.order_id));
      setSalesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreSales(false);
    }
  };

  const loadMoreInvoices = async () => {
    if (invoicesNextCursor === null || isLoadingMoreInvoices) {
      return;
    }

    setIsLoadingMoreInvoices(true);
    try {
      const page = await fetchInvoices({ before: invoicesNextCursor });
      setInvoices((current) => appendUniqueByKey(current, page.items, (invoice) => invoice.id));
      setInvoicesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreInvoices(false);
    }
  };

  const loadMoreCustomerProfiles = async () => {
    if (customerProfilesNextCursor === null || isLoadingMoreCustomerProfiles) {
      return;
    }

    setIsLoadingMoreCustomerProfiles(true);
    try {
      const page = await fetchCustomerPortalProfiles({ before: customerProfilesNextCursor });
      setCustomerProfiles((current) =>
        appendUniqueByKey(current, page.items, (profile) => profile.id)
      );
      setCustomerProfilesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreCustomerProfiles(false);
    }
  };

  const resetAdminSession = () => {
    setAuthToken(null);
    setCurrentAdmin(null);
    setActiveRoleId(null);
    setAdminAuth("unauthenticated");
  };

  const restoreAdminSession = async () => {
    if (!getAuthToken()) {
      resetAdminSession();
      return;
    }

    setAdminAuth("checking");

    try {
      const me = await fetchMe();
      await loadAdminData(me);
      setAdminAuth("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        await loadDemoAdminData();
        setAdminAuth("demo");
        return;
      }

      resetAdminSession();
    }
  };

  const handleAdminLogin = async (input: AdminLoginInput): Promise<AdminAuthPayload> => {
    const payload = await loginRequest(input);
    await loadAdminData(payload);
    setAdminAuth("authenticated");
    return payload;
  };

  const handleAdminLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.warn("Unable to notify the API about logout.", error);
      setAuthToken(null);
    } finally {
      resetAdminSession();
    }
  };

  useEffect(() => {
    setOnUnauthorized(() => {
      resetAdminSession();
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  useEffect(() => {
    void restoreAdminSession();
  }, []);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((current) =>
      current.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPromotionId(null);
    setVoucherCode("");
  };

  const grabPromotion = (promotionId: number) => {
    setSelectedPromotionId(promotionId);
    setIsAccountOpen(false);
    setIsCartOpen(true);
  };

  const lookupCustomer = async (
    email: string,
    orderId: number
  ): Promise<CustomerLookupPayload> => {
    const normalizedEmail = email.trim().toLowerCase();
    const payload = await lookupCustomerRequest(normalizedEmail, orderId);

    if (payload.profile !== null || payload.orders.length > 0) {
      setCustomerAccountEmail(normalizedEmail);
      rememberAccountEmail(normalizedEmail);
      setCustomerAccountOrderId(orderId);
      rememberAccountOrderId(orderId);
    }

    return payload;
  };

  const submitCheckout = async (input: CreateOrderInput): Promise<Order> => {
    const order = await checkoutRequest(input);
    const checkoutEmail = order.customer_email.trim().toLowerCase();

    setCustomerAccountEmail(checkoutEmail);
    rememberAccountEmail(checkoutEmail);
    setCustomerAccountOrderId(order.id);
    rememberAccountOrderId(order.id);
    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then((page) => {
      setCustomerProfiles(page.items);
      setCustomerProfilesNextCursor(page.next_cursor);
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} placed for ${currencyFromCents(
          order.total_cents ?? order.subtotal_cents
        )}.`
      },
      ...current
    ]);

    return order;
  };

  const createAdminOrder = async (input: CreateOrderInput): Promise<Order> => {
    const order = await createAdminOrderRequest(input);

    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then((page) => {
      setCustomerProfiles(page.items);
      setCustomerProfilesNextCursor(page.next_cursor);
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Admin order #${order.id} created for ${order.customer_name}.`
      },
      ...current
    ]);

    return order;
  };

  const updateAdminOrder = async (orderId: number, input: CreateOrderInput): Promise<Order> => {
    const order = await updateAdminOrderRequest(orderId, input);

    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} updated for ${order.customer_name}.`
      },
      ...current
    ]);

    return order;
  };

  const updateOrderFulfillment = async (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ): Promise<Order> => {
    const order = await updateOrderFulfillmentRequest(orderId, input);

    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    if (order.fulfillment_status === "completed" || order.fulfillment_status === "delivered") {
      void fetchSales().then((page) => {
        setSales(page.items);
        setSalesNextCursor(page.next_cursor);
      });
      void fetchSalesSummary().then(setSalesSummary);
    }
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} moved to ${fulfillmentLabel(order.fulfillment_status)}.`
      },
      ...current
    ]);

    return order;
  };

  const deleteAdminOrder = async (orderId: number): Promise<void> => {
    await deleteAdminOrderRequest(orderId);

    setOrders((current) => current.filter((order) => order.id !== orderId));
    setPayments((current) => current.filter((payment) => payment.order_id !== orderId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${orderId} was removed from the order book.`
      },
      ...current
    ]);
  };

  const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
    const payment = await createPaymentRequest(input);

    setPayments((current) => {
      const exists = current.some((item) => item.id === payment.id);
      return exists
        ? current.map((item) => (item.id === payment.id ? payment : item))
        : [payment, ...current];
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${payment.id} recorded for order #${payment.order_id}.`
      },
      ...current
    ]);

    return payment;
  };

  const updatePayment = async (
    paymentId: number,
    input: UpdatePaymentInput
  ): Promise<Payment> => {
    const payment = await updatePaymentRequest(paymentId, input);

    setPayments((current) => current.map((item) => (item.id === payment.id ? payment : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${payment.id} was updated for order #${payment.order_id}.`
      },
      ...current
    ]);

    return payment;
  };

  const deletePayment = async (paymentId: number): Promise<void> => {
    await deletePaymentRequest(paymentId);

    setPayments((current) => current.filter((payment) => payment.id !== paymentId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${paymentId} was deleted from the ledger.`
      },
      ...current
    ]);
  };

  const updateSalesDetails = async (
    orderId: number,
    input: UpdateSalesDetailsInput
  ): Promise<SalesRecord> => {
    const sale = await updateSalesDetailsRequest(orderId, input);

    setSales((current) => current.map((item) => (item.order_id === sale.order_id ? sale : item)));
    void fetchSalesSummary().then(setSalesSummary);

    return sale;
  };

  const updateSalesStatus = async (
    orderId: number,
    input: UpdateSalesStatusInput
  ): Promise<SalesRecord> => {
    const sale = await updateSalesStatusRequest(orderId, input);

    setSales((current) => current.map((item) => (item.order_id === sale.order_id ? sale : item)));
    void fetchSalesSummary().then(setSalesSummary);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Sale #${sale.order_id} moved to ${sale.status}.`
      },
      ...current
    ]);

    return sale;
  };

  const createInvoiceFromOrder = async (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ): Promise<Invoice> => {
    const invoice = await createInvoiceFromOrderRequest(orderId, input);

    setInvoices((current) => [invoice, ...current]);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Invoice ${invoice.invoice_number} was created for order #${invoice.order_id}.`
      },
      ...current
    ]);

    return invoice;
  };

  const updateInvoiceBilling = async (
    invoiceId: number,
    input: UpdateInvoiceBillingInput
  ): Promise<Invoice> => {
    const invoice = await updateInvoiceBillingRequest(invoiceId, input);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));

    return invoice;
  };

  const voidInvoice = async (invoiceId: number): Promise<Invoice> => {
    const invoice = await voidInvoiceRequest(invoiceId);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Invoice ${invoice.invoice_number} was voided.` },
      ...current
    ]);

    return invoice;
  };

  const recordInvoicePayment = async (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ): Promise<Invoice> => {
    const invoice = await recordInvoicePaymentRequest(invoiceId, input);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment recorded for invoice ${invoice.invoice_number}.`
      },
      ...current
    ]);

    return invoice;
  };

  const exportAutoCountInvoices = async (input: AutoCountExportInput): Promise<void> => {
    const blob = await exportAutoCountInvoicesRequest(input);
    downloadBlob(blob, `autocount-invoices-${new Date().toISOString().slice(0, 10)}.csv`);

    const page = await fetchInvoices();
    setInvoices(page.items);
    setInvoicesNextCursor(page.next_cursor);
    setActivityFeed((current) => [
      { happened_at: "Now", detail: "AutoCount invoice export was downloaded." },
      ...current
    ]);
  };

  const updateSystemSetting = async (
    key: string,
    input: UpdateSystemSettingInput
  ): Promise<SystemSetting> => {
    const setting = await updateSystemSettingRequest(key, input);

    setSystemSettings((current) =>
      current.map((item) => (item.key === setting.key ? setting : item))
    );

    return setting;
  };

  const createRole = async (input: CreateRoleInput): Promise<Role> => {
    const role = await createRoleRequest(input);

    setPermissions((current) =>
      current
        ? {
            ...current,
            roles: [...current.roles, role]
          }
        : current
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `${role.name} role was added to the permission matrix.` },
      ...current
    ]);

    return role;
  };

  const updateRole = async (roleId: number, input: UpdateRoleInput): Promise<Role> => {
    const role = await updateRoleRequest(roleId, input);

    setPermissions((current) =>
      current
        ? {
            ...current,
            roles: current.roles.map((item) => (item.id === role.id ? role : item))
          }
        : current
    );

    return role;
  };

  const deleteRole = async (roleId: number): Promise<void> => {
    await deleteRoleRequest(roleId);

    setPermissions((current) => {
      if (!current) {
        return current;
      }

      const roles = current.roles.filter((role) => role.id !== roleId);

      return {
        ...current,
        roles,
        permissions: current.permissions.filter((permission) => permission.role_id !== roleId)
      };
    });
  };

  const updateRolePermission = async (
    input: UpdateRolePagePermissionInput
  ): Promise<RolePagePermission> => {
    const permission = await updateRolePermissionRequest(input);

    setPermissions((current) => (current ? applyPermissionUpdate(current, permission) : current));

    return permission;
  };

  const createAdminUser = async (input: CreateAdminUserInput): Promise<AdminUser> => {
    const user = await createAdminUserRequest(input);

    setAdminUsers((current) => [...current, user]);
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `${user.display_name} was added as an admin user.` },
      ...current
    ]);

    return user;
  };

  const updateAdminUserProfile = async (
    userId: number,
    input: UpdateAdminUserProfileInput
  ): Promise<AdminUser> => {
    const user = await updateAdminUserProfileRequest(userId, input);

    setAdminUsers((current) => current.map((item) => (item.id === user.id ? user : item)));

    return user;
  };

  const setAdminUserActive = async (
    userId: number,
    input: SetAdminUserActiveInput
  ): Promise<AdminUser> => {
    const user = await setAdminUserActiveRequest(userId, input);

    setAdminUsers((current) => current.map((item) => (item.id === user.id ? user : item)));

    return user;
  };

  const resetAdminUserPassword = async (
    userId: number,
    input: AdminResetPasswordInput
  ): Promise<void> => {
    await resetAdminUserPasswordRequest(userId, input);
  };

  const changeOwnPassword = async (input: ChangeOwnPasswordInput): Promise<void> => {
    await changeOwnPasswordRequest(input);
    await handleAdminLogout();
  };

  const createPromotion = async (input: CreatePromotionInput): Promise<Promotion> => {
    const promotion = await createPromotionRequest(input);

    setPromotions((current) =>
      current.some((item) => item.id === promotion.id)
        ? current.map((item) => (item.id === promotion.id ? promotion : item))
        : [promotion, ...current]
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion created: ${promotion.title}.` },
      ...current
    ]);

    return promotion;
  };

  const updatePromotion = async (
    promotionId: number,
    input: UpdatePromotionInput
  ): Promise<Promotion> => {
    const promotion = await updatePromotionRequest(promotionId, input);

    setPromotions((current) =>
      current.map((item) => (item.id === promotion.id ? promotion : item))
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion updated: ${promotion.title}.` },
      ...current
    ]);

    return promotion;
  };

  const deletePromotion = async (promotionId: number): Promise<void> => {
    const promotion = promotions.find((item) => item.id === promotionId);

    await deletePromotionRequest(promotionId);

    setPromotions((current) => current.filter((item) => item.id !== promotionId));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion deleted: ${promotion?.title ?? `#${promotionId}`}.` },
      ...current
    ]);
  };

  const createVoucher = async (input: CreateVoucherInput): Promise<Voucher> => {
    const voucher = await createVoucherRequest(input);

    setVouchers((current) =>
      current.some((item) => item.id === voucher.id)
        ? current.map((item) => (item.id === voucher.id ? voucher : item))
        : [voucher, ...current]
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher created: ${voucher.code}.` },
      ...current
    ]);

    return voucher;
  };

  const updateVoucher = async (voucherId: number, input: UpdateVoucherInput): Promise<Voucher> => {
    const voucher = await updateVoucherRequest(voucherId, input);

    setVouchers((current) => current.map((item) => (item.id === voucher.id ? voucher : item)));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher updated: ${voucher.code}.` },
      ...current
    ]);

    return voucher;
  };

  const deleteVoucher = async (voucherId: number): Promise<void> => {
    const voucher = vouchers.find((item) => item.id === voucherId);

    await deleteVoucherRequest(voucherId);

    setVouchers((current) => current.filter((item) => item.id !== voucherId));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher deleted: ${voucher?.code ?? `#${voucherId}`}.` },
      ...current
    ]);
  };

  const runSupplierSync = async () => {
    const restocked = await supplierSync();
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Supplier sync restocked ${restocked.length} product(s).`
      },
      ...current
    ]);
  };

  const loadMoreActivity = async () => {
    if (oldestAuditEventId === null || isLoadingMoreActivity) {
      return;
    }

    setIsLoadingMoreActivity(true);
    try {
      const events = await fetchAuditEvents(oldestAuditEventId);
      setActivityFeed((current) => [...current, ...events.map(auditEventToActivityItem)]);
      setOldestAuditEventId(events.length > 0 ? events[events.length - 1].id : null);
      setHasMoreActivity(events.length >= AUDIT_EVENTS_PAGE_SIZE);
    } finally {
      setIsLoadingMoreActivity(false);
    }
  };

  const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
    const category = await createCategoryRequest(input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.some((item) => item.slug === category.slug)
              ? current.categories
              : [...current.categories, category]
          }
        : current
    );
    setStorefront((current) => {
      if (!current || current.categories.some((item) => item.slug === category.slug)) {
        return current;
      }

      return {
        ...current,
        categories: [...current.categories, category]
      };
    });
    setSelectedCategory(category.slug);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category created: ${category.name}.`
      },
      ...current
    ]);

    return category;
  };

  const updateCategory = async (
    slug: string,
    input: UpdateCategoryInput
  ): Promise<Category> => {
    const category = await updateCategoryRequest(slug, input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((item) =>
              item.slug === category.slug ? category : item
            )
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((item) =>
              item.slug === category.slug ? category : item
            )
          }
        : current
    );
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category updated: ${category.name}.`
      },
      ...current
    ]);

    return category;
  };

  const deleteCategory = async (slug: string): Promise<void> => {
    const category = adminCatalog?.categories.find((item) => item.slug === slug);

    await deleteCategoryRequest(slug);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.filter((item) => item.slug !== slug)
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            categories: current.categories.filter((item) => item.slug !== slug)
          }
        : current
    );
    setSelectedCategory((current) => (current === slug ? "all" : current));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category deleted: ${category?.name ?? slug}.`
      },
      ...current
    ]);
  };

  const createProduct = async (input: CreateProductInput): Promise<Product> => {
    const product = await createProductRequest(input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.some((item) => item.id === product.id)
              ? current.products.map((item) => (item.id === product.id ? product : item))
              : [...current.products, product]
          }
        : current
    );
    if (product.featured) {
      setStorefront((current) => {
        if (!current || current.products.some((item) => item.id === product.id)) {
          return current;
        }

        return {
          ...current,
          products: [...current.products, product]
        };
      });
    }

    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product created: ${product.name}${product.featured ? " and published to the storefront." : "."}`
      },
      ...current
    ]);

    return product;
  };

  const updateProduct = async (
    productId: number,
    input: UpdateProductInput
  ): Promise<Product> => {
    const product = await updateProductRequest(productId, input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.map((item) => (item.id === product.id ? product : item))
          }
        : current
    );
    setStorefront((current) => {
      if (!current) {
        return current;
      }

      const exists = current.products.some((item) => item.id === product.id);

      if (!product.featured) {
        return {
          ...current,
          products: current.products.filter((item) => item.id !== product.id)
        };
      }

      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === product.id ? product : item))
          : [...current.products, product]
      };
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product updated: ${product.name}.`
      },
      ...current
    ]);

    return product;
  };

  const deleteProduct = async (productId: number): Promise<void> => {
    const product = adminCatalog?.products.find((item) => item.id === productId);

    await deleteProductRequest(productId);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((item) => item.id !== productId)
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((item) => item.id !== productId)
          }
        : current
    );
    setCart((current) => current.filter((item) => item.product.id !== productId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product deleted: ${product?.name ?? `#${productId}`}.`
      },
      ...current
    ]);
  };

  const createCustomerPortalProfile = async (
    input: CreateCustomerPortalProfileInput
  ): Promise<CustomerPortalProfile> => {
    const profile = await createCustomerPortalProfileRequest(input);

    setCustomerProfiles((current) => [profile, ...current]);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile.customer_name} customer portal profile was created.`
      },
      ...current
    ]);

    return profile;
  };

  const updateCustomerPortalProfile = async (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ): Promise<CustomerPortalProfile> => {
    const profile = await updateCustomerPortalProfileRequest(profileId, input);

    setCustomerProfiles((current) =>
      current.map((item) => (item.id === profile.id ? profile : item))
    );
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile.customer_name} customer portal profile was updated.`
      },
      ...current
    ]);

    return profile;
  };

  const deleteCustomerPortalProfile = async (profileId: number): Promise<void> => {
    const profile = customerProfiles.find((item) => item.id === profileId);

    await deleteCustomerPortalProfileRequest(profileId);

    setCustomerProfiles((current) => current.filter((item) => item.id !== profileId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile?.customer_name ?? "Customer"} portal profile was deleted.`
      },
      ...current
    ]);
  };

  const openShop = () => openView("store");

  if (view === "forbidden") {
    return <StatusPage code="403" onGoHome={() => openView("landing")} onShop={openShop} />;
  }

  if (view === "not-found") {
    return <StatusPage code="404" onGoHome={() => openView("landing")} onShop={openShop} />;
  }

  // Show landing page immediately without waiting for storefront data
  if (view === "landing") {
    return (
      <div className="app-shell landing-shell">
        <LandingView onOpenShop={openShop} />
      </div>
    );
  }

  if (!storefront) {
    return <main className="loading-shell">{t("shop.loading")}</main>;
  }

  return (
    <div
      className={
        view === "admin" ? "app-shell admin-shell" : view === "store" ? "app-shell storefront-app-shell" : "app-shell"
      }
    >
      {view === "store" ? (
        <StorefrontView
          cart={cart}
          cartCount={cartCount}
          customerAccountEmail={customerAccountEmail}
          customerAccountOrderId={customerAccountOrderId}
          filteredProducts={filteredProducts}
          isCartOpen={isCartOpen}
          isAccountOpen={isAccountOpen}
          maxPriceCents={maxPriceCents}
          minPriceCents={minPriceCents}
          onAddToCart={addToCart}
          onAccountAuthenticated={(email) => {
            const normalizedEmail = email.trim().toLowerCase();
            setCustomerAccountEmail(normalizedEmail);
            rememberAccountEmail(normalizedEmail);
          }}
          onChangeCategory={setSelectedCategory}
          onChangeMaxPrice={setMaxPriceCents}
          onChangeMinPrice={setMinPriceCents}
          onChangeSearch={setSearchTerm}
          onChangeSort={setSortOption}
          onCheckout={submitCheckout}
          onCloseAccount={() => setIsAccountOpen(false)}
          onClearCart={clearCart}
          onCloseCart={() => setIsCartOpen(false)}
          onLookupCustomer={lookupCustomer}
          onOpenAdmin={() => openView("admin")}
          onOpenAccount={() => {
            setIsCartOpen(false);
            setIsAccountOpen(true);
          }}
          onOpenCart={() => {
            setIsAccountOpen(false);
            setIsCartOpen(true);
          }}
          onGrabPromotion={grabPromotion}
          onPromotionChange={setSelectedPromotionId}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onVoucherCodeChange={setVoucherCode}
          publicOffers={publicOffers}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedPromotionId={selectedPromotionId}
          sortOption={sortOption}
          storefront={storefront}
          voucherCode={voucherCode}
        />
      ) : adminAuth === "unauthenticated" ? (
        <AdminLoginScreen
          onBackToStore={() => openView("store")}
          onLogin={handleAdminLogin}
        />
      ) : adminAuth === "checking" || !dashboard || !adminCatalog ? (
        <main className="loading-shell">Loading admin console...</main>
      ) : (
        <AdminView
          activityFeed={activityFeed}
          activeRoleId={activeRoleId}
          adminTab={adminTab}
          adminUsers={adminUsers}
          categories={adminCatalog.categories}
          currentAdmin={currentAdmin}
          customerProfiles={customerProfiles}
          dashboard={dashboard}
          demoMode={adminAuth === "demo"}
          hasMoreActivity={hasMoreActivity}
          isChangePasswordOpen={isChangePasswordOpen}
          isLoadingMoreActivity={isLoadingMoreActivity}
          isLoadingMoreCustomerProfiles={isLoadingMoreCustomerProfiles}
          isLoadingMoreInvoices={isLoadingMoreInvoices}
          isLoadingMoreOrders={isLoadingMoreOrders}
          isLoadingMoreSales={isLoadingMoreSales}
          onLoadMoreActivity={() => void loadMoreActivity()}
          onBackToStore={() => openView("store")}
          onChangeOwnPassword={changeOwnPassword}
          onChangeTab={setAdminTab}
          onCloseChangePassword={() => setIsChangePasswordOpen(false)}
          onCreateAdminOrder={createAdminOrder}
          onCreateAdminUser={createAdminUser}
          onCreateCategory={createCategory}
          onCreateCustomerPortalProfile={createCustomerPortalProfile}
          onCreateInvoiceFromOrder={createInvoiceFromOrder}
          onCreatePayment={createPayment}
          onCreateProduct={createProduct}
          onCreatePromotion={createPromotion}
          onCreateRole={createRole}
          onCreateVoucher={createVoucher}
          onDeleteAdminOrder={deleteAdminOrder}
          onDeleteCategory={deleteCategory}
          onDeleteCustomerPortalProfile={deleteCustomerPortalProfile}
          onDeletePayment={deletePayment}
          onDeleteProduct={deleteProduct}
          onDeletePromotion={deletePromotion}
          onDeleteRole={deleteRole}
          onDeleteVoucher={deleteVoucher}
          onExportAutoCountInvoices={exportAutoCountInvoices}
          onLogout={() => void handleAdminLogout()}
          onLoadMoreCustomerProfiles={() => void loadMoreCustomerProfiles()}
          onLoadMoreInvoices={() => void loadMoreInvoices()}
          onLoadMoreOrders={() => void loadMoreOrders()}
          onLoadMoreSales={() => void loadMoreSales()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onRecordInvoicePayment={recordInvoicePayment}
          onResetAdminUserPassword={resetAdminUserPassword}
          onRunSync={runSupplierSync}
          onSetAdminUserActive={setAdminUserActive}
          onUpdateAdminOrder={updateAdminOrder}
          onUpdateAdminUserProfile={updateAdminUserProfile}
          onUpdateCategory={updateCategory}
          onUpdateOrderFulfillment={updateOrderFulfillment}
          onUpdateInvoiceBilling={updateInvoiceBilling}
          onUpdatePayment={updatePayment}
          onUpdateProduct={updateProduct}
          onUpdatePromotion={updatePromotion}
          onUpdateRole={updateRole}
          onUpdateRolePermission={updateRolePermission}
          onUpdateSalesDetails={updateSalesDetails}
          onUpdateSalesStatus={updateSalesStatus}
          onUpdateSystemSetting={updateSystemSetting}
          onUpdateVoucher={updateVoucher}
          onVoidInvoice={voidInvoice}
          hasMoreCustomerProfiles={customerProfilesNextCursor !== null}
          hasMoreInvoices={invoicesNextCursor !== null}
          hasMoreOrders={ordersNextCursor !== null}
          hasMoreSales={salesNextCursor !== null}
          orders={orders}
          payments={payments}
          invoices={invoices}
          sales={sales}
          salesSummary={salesSummary}
          systemSettings={systemSettings}
          permissions={permissions}
          products={adminCatalog.products}
          promotions={promotions}
          onUpdateCustomerPortalProfile={updateCustomerPortalProfile}
          vouchers={vouchers}
        />
      )}
    </div>
  );
}

type StorefrontViewProps = {
  cart: CartItem[];
  cartCount: number;
  customerAccountEmail: string;
  customerAccountOrderId: number | null;
  filteredProducts: Product[];
  isAccountOpen: boolean;
  isCartOpen: boolean;
  maxPriceCents: number | null;
  minPriceCents: number | null;
  onAddToCart: (product: Product) => void;
  onAccountAuthenticated: (email: string) => void;
  onChangeCategory: (slug: string) => void;
  onChangeMaxPrice: (value: number | null) => void;
  onChangeMinPrice: (value: number | null) => void;
  onChangeSearch: (value: string) => void;
  onChangeSort: (value: StorefrontSort) => void;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onCloseAccount: () => void;
  onClearCart: () => void;
  onCloseCart: () => void;
  onLookupCustomer: (email: string, orderId: number) => Promise<CustomerLookupPayload>;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onGrabPromotion: (promotionId: number) => void;
  onPromotionChange: (promotionId: number | null) => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onVoucherCodeChange: (code: string) => void;
  publicOffers: PublicOffersPayload | null;
  searchTerm: string;
  selectedCategory: string;
  selectedPromotionId: number | null;
  sortOption: StorefrontSort;
  storefront: StorefrontPayload;
  voucherCode: string;
};

function StorefrontView({
  cart,
  cartCount,
  customerAccountEmail,
  customerAccountOrderId,
  filteredProducts,
  isAccountOpen,
  isCartOpen,
  maxPriceCents,
  minPriceCents,
  onAddToCart,
  onAccountAuthenticated,
  onChangeCategory,
  onChangeMaxPrice,
  onChangeMinPrice,
  onChangeSearch,
  onChangeSort,
  onCheckout,
  onCloseAccount,
  onClearCart,
  onCloseCart,
  onLookupCustomer,
  onOpenAdmin,
  onOpenAccount,
  onOpenCart,
  onGrabPromotion,
  onPromotionChange,
  onRemoveFromCart,
  onUpdateQuantity,
  onVoucherCodeChange,
  publicOffers,
  searchTerm,
  selectedCategory,
  selectedPromotionId,
  sortOption,
  storefront,
  voucherCode
}: StorefrontViewProps) {
  const { t } = useI18n();
  const activeCategory =
    storefront.categories.find((category) => category.slug === selectedCategory) ?? storefront.categories[0];

  return (
    <div className="storefront-shell">
      <div className="top-strip">
        <p>
          {t("shop.strip.before")}
          <a href="https://wa.me/60174056993" target="_blank" rel="noopener">
            017-405 6993
          </a>
          {t("shop.strip.after")}
        </p>
      </div>

      <header className="site-header">
        <div className="brand-block">
          <a className="brand-logo-link" href="/" aria-label="Back to the main page">
            <EkowayMark />
          </a>
          <div className="brand-copy">
            <p className="eyebrow">{t("shop.eyebrow")}</p>
            <h1>{t("shop.brand")}</h1>
            <p className="brand-tagline">{t("shop.tagline")}</p>
          </div>
        </div>

        <div className="header-actions">
          <label className="search-shell">
            <span>{t("shop.search.label")}</span>
            <input
              type="search"
              placeholder={t("shop.search.placeholder")}
              value={searchTerm}
              onChange={(event) => onChangeSearch(event.target.value)}
            />
          </label>
          <LangToggle />
          <button className="outline-button" onClick={onOpenAccount}>
            {t("shop.account")}
          </button>
          <button className="solid-button cart-button" onClick={onOpenCart}>
            {t("shop.cart")}
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="mega-nav" aria-label="Primary">
        {departmentMenu.map((item) => (
          <a href="#categories" key={item.key}>
            {t(item.key)}
          </a>
        ))}
        <button className="nav-button" onClick={onOpenAdmin}>
          {t("shop.nav.admin")}
        </button>
      </nav>

      <main className="page-shell">
        <section className="hero-grid">
          <article className="hero-panel hero-primary">
            <div className="hero-copy">
              <p className="eyebrow">{t("shop.hero.eyebrow")}</p>
              <h2>{t("shop.hero.title")}</h2>
              <p>{t("shop.hero.body")}</p>
              <div className="hero-actions">
                <a className="solid-button" href="#featured-products">
                  {t("shop.hero.cta1")}
                </a>
                <a className="outline-button" href="#services">
                  {t("shop.hero.cta2")}
                </a>
              </div>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>{t("shop.hero.m1.v")}</strong>
                <span>{t("shop.hero.m1.k")}</span>
              </div>
              <div>
                <strong>{t("shop.hero.m2.v")}</strong>
                <span>{t("shop.hero.m2.k")}</span>
              </div>
              <div>
                <strong>{t("shop.hero.m3.v")}</strong>
                <span>{t("shop.hero.m3.k")}</span>
              </div>
            </div>
          </article>

          <article className="hero-panel hero-secondary">
            <p className="eyebrow">{t("shop.panel2.eyebrow")}</p>
            <h3>{t("shop.panel2.title")}</h3>
            <p>{t("shop.panel2.body")}</p>
            <ul className="deal-points">
              <li>{t("shop.panel2.p1")}</li>
              <li>{t("shop.panel2.p2")}</li>
              <li>{t("shop.panel2.p3")}</li>
            </ul>
            <a className="text-link" href="#deals">
              {t("shop.panel2.link")}
            </a>
          </article>

          <article className="hero-panel hero-tertiary">
            <p className="eyebrow">{t("shop.panel3.eyebrow")}</p>
            <h3>{t("shop.panel3.title")}</h3>
            <p>{t("shop.panel3.body")}</p>
            <div className="mini-board">
              {quickServiceCalls.map((item) => (
                <div key={item.key}>
                  <span>{t(item.key)}</span>
                  <strong>{t(item.detail)}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="promo-rail" id="deals">
          {publicOffers?.promotions.length ? (
            publicOffers.promotions.map((promotion) => (
              <article key={promotion.id}>
                <p className="eyebrow">{promotion.label}</p>
                <h3>{promotion.title}</h3>
                <p>{promotion.description}</p>
                <button
                  className="solid-button"
                  onClick={() => onGrabPromotion(promotion.id)}
                  type="button"
                >
                  Grab deal
                </button>
              </article>
            ))
          ) : (
            storefront.promotions.map((promotion) => (
              <article key={promotion.title}>
                <p className="eyebrow">{promotion.label}</p>
                <h3>{promotion.title}</h3>
                <p>{promotion.description}</p>
              </article>
            ))
          )}
        </section>

        <section className="seasonal-band" aria-label="Seasonal highlights">
          {seasonalTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading">
            <p className="eyebrow">{t("shop.sec.cat.eyebrow")}</p>
            <h2>{t("shop.sec.cat.title")}</h2>
            <p className="section-copy">
              {t("shop.sec.cat.now")} {activeCategory?.name ?? t("shop.dept.all")}
            </p>
          </div>

          <div className="category-grid">
            {storefront.categories.map((category) => (
              <button
                key={category.slug}
                className={`category-card ${selectedCategory === category.slug ? "active" : ""}`}
                onClick={() => onChangeCategory(category.slug)}
              >
                <strong>{category.name}</strong>
                <span>{category.teaser}</span>
              </button>
            ))}
          </div>

          <div className="filter-bar">
            <label className="filter-field">
              <span>{t("shop.filter.min")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="$0"
                value={minPriceCents == null ? "" : minPriceCents / 100}
                onChange={(event) => {
                  onChangeMinPrice(priceInputToCents(event.target.value));
                }}
              />
            </label>
            <label className="filter-field">
              <span>{t("shop.filter.max")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Any"
                value={maxPriceCents == null ? "" : maxPriceCents / 100}
                onChange={(event) => {
                  onChangeMaxPrice(priceInputToCents(event.target.value));
                }}
              />
            </label>
            <label className="filter-field">
              <span>{t("shop.filter.sort")}</span>
              <select
                value={sortOption}
                onChange={(event) => onChangeSort(event.target.value as StorefrontSort)}
              >
                <option value="featured">{t("shop.sort.featured")}</option>
                <option value="price_asc">{t("shop.sort.priceAsc")}</option>
                <option value="price_desc">{t("shop.sort.priceDesc")}</option>
                <option value="name">{t("shop.sort.name")}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="savings-band">
          <div>
            <p className="eyebrow">{t("shop.savings.eyebrow")}</p>
            <h3>{t("shop.savings.title")}</h3>
            <p>{t("shop.savings.count", { n: filteredProducts.length })}</p>
          </div>
          <div className="savings-tags">
            <span>{t("shop.savings.t1")}</span>
            <span>{t("shop.savings.t2")}</span>
            <span>{t("shop.savings.t3")}</span>
            <span>{t("shop.savings.t4")}</span>
          </div>
        </section>

        <section className="product-section" id="featured-products">
          <div className="section-heading">
            <p className="eyebrow">{t("shop.products.eyebrow")}</p>
            <h2>{t("shop.products.title")}</h2>
          </div>

           <div className="product-grid">
             {filteredProducts.map((product) => {
               const categoryName =
                 storefront.categories.find((category) => category.slug === product.category_slug)?.name ??
                 product.category_slug;

               return (
                 <article className="product-card" key={product.id}>
                   <div className="product-topline">
                     <span className="badge-chip">{product.badge}</span>
                     <span className="tone-chip">{product.tone}</span>
                   </div>

                   <div
                     className={
                       "product-visual" + (product.image_url ? "" : " tone-fallback")
                     }
                   >
                     {product.image_url ? (
                       <img
                         src={product.image_url}
                         alt={product.name}
                         loading="lazy"
                         onError={(event) => {
                           event.currentTarget.style.display = "none";
                           const parent = event.currentTarget.parentElement;
                           if (parent) parent.classList.add("tone-fallback");
                         }}
                       />
                     ) : null}
                     <span>{categoryName}</span>
                     <strong>{product.tone}</strong>
                   </div>

                   <div className="product-meta">
                     <h3>{product.name}</h3>
                     <p>{product.description}</p>
                   </div>

                   <footer>
                     <div>
                       <p className="price-label">{t("shop.product.from")}</p>
                       <strong>{currencyFromCents(product.price_cents)}</strong>
                       <p>{categoryName}</p>
                     </div>
                     <button onClick={() => onAddToCart(product)}>{t("shop.product.add")}</button>
                   </footer>
                 </article>
               );
             })}
           </div>
        </section>

        <section className="services-section" id="services">
          <div className="section-heading">
            <p className="eyebrow">{t("shop.services.eyebrow")}</p>
            <h2>{t("shop.services.title")}</h2>
          </div>

          <div className="service-grid">
            {storefront.services.map((service) => (
              <article className="service-card" key={service.name}>
                <p className="eyebrow">{t("shop.services.card")}</p>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pro-section" id="pro-desk">
          <div className="pro-copy">
            <p className="eyebrow">{t("shop.pro.eyebrow")}</p>
            <h2>{t("shop.pro.title")}</h2>
            <p>{t("shop.pro.body")}</p>
          </div>

          <div className="pro-panel">
            {storefront.pro_stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <CartDrawer
        cart={cart}
        customerAccountEmail={customerAccountEmail}
        open={isCartOpen}
        onCheckout={onCheckout}
        onClose={onCloseCart}
        onCompleted={onClearCart}
        onPromotionChange={onPromotionChange}
        onRemoveFromCart={onRemoveFromCart}
        onUpdateQuantity={onUpdateQuantity}
        onVoucherCodeChange={onVoucherCodeChange}
        publicOffers={publicOffers}
        selectedPromotionId={selectedPromotionId}
        voucherCode={voucherCode}
      />
      <AccountDrawer
        open={isAccountOpen}
        customerAccountEmail={customerAccountEmail}
        customerAccountOrderId={customerAccountOrderId}
        onLookupCustomer={onLookupCustomer}
        onAuthenticated={onAccountAuthenticated}
        onClose={onCloseAccount}
      />
      <SupportChatWidget
        customerEmail={customerAccountEmail}
        isSuppressed={isCartOpen || isAccountOpen}
      />
    </div>
  );
}

type AccountDrawerProps = {
  open: boolean;
  customerAccountEmail: string;
  customerAccountOrderId: number | null;
  onLookupCustomer: (email: string, orderId: number) => Promise<CustomerLookupPayload>;
  onAuthenticated: (email: string) => void;
  onClose: () => void;
};

type AccountLookupStatus = "idle" | "loading" | "success" | "error";
type AccountAuthView = "login" | "register" | "guest";
type AccountPortalTab = "transactions" | "membership" | "benefits" | "sessions";
type PortalLoadStatus = "idle" | "loading" | "success" | "not-found" | "error";

const PORTAL_TRANSACTIONS_PAGE_SIZE = 20;

function customerSessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform = userAgent.includes("iPhone") || userAgent.includes("iPad")
    ? "iOS"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("Mac OS")
        ? "macOS"
        : userAgent.includes("Windows")
          ? "Windows"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown platform";

  return `${browser} on ${platform}`;
}

const emptyCustomerLookupPayload: CustomerLookupPayload = {
  profile: null,
  orders: []
};

const emptyCustomerAuthForm: CustomerRegisterInput = {
  email: "",
  password: "",
  display_name: ""
};

function AccountDrawer({
  open,
  customerAccountEmail,
  customerAccountOrderId,
  onLookupCustomer,
  onAuthenticated,
  onClose
}: AccountDrawerProps) {
  const [lookupEmail, setLookupEmail] = useState(customerAccountEmail);
  const [lookupOrderId, setLookupOrderId] = useState(
    customerAccountOrderId !== null ? String(customerAccountOrderId) : ""
  );
  const [lookupPayload, setLookupPayload] = useState<CustomerLookupPayload>(
    emptyCustomerLookupPayload
  );
  const [lookupStatus, setLookupStatus] = useState<AccountLookupStatus>("idle");
  const [lookupError, setLookupError] = useState("");
  const lastAutoLookupKeyRef = useRef<string | null>(null);

  const [session, setSession] = useState<CustomerMePayload | null>(null);
  const [authView, setAuthView] = useState<AccountAuthView>("login");
  const [authForm, setAuthForm] = useState<CustomerRegisterInput>(emptyCustomerAuthForm);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [authError, setAuthError] = useState("");

  const [portalTab, setPortalTab] = useState<AccountPortalTab>("transactions");

  const [membership, setMembership] = useState<MembershipPayload | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<PortalLoadStatus>("idle");

  const [benefits, setBenefits] = useState<MembershipBenefitsPayload | null>(null);
  const [benefitsStatus, setBenefitsStatus] = useState<PortalLoadStatus>("idle");

  const [transactions, setTransactions] = useState<CustomerTransactionsPayload | null>(null);
  const [transactionsStatus, setTransactionsStatus] = useState<PortalLoadStatus>("idle");
  const [transactionsOffset, setTransactionsOffset] = useState(0);
  const [customerSessions, setCustomerSessions] = useState<CustomerSession[]>([]);
  const [customerSessionsStatus, setCustomerSessionsStatus] = useState<PortalLoadStatus>("idle");
  const [customerSessionsError, setCustomerSessionsError] = useState("");
  const [sessionActionId, setSessionActionId] = useState<number | "others" | null>(null);

  useEffect(() => {
    if (session) {
      onAuthenticated(session.account.email);
    }
  }, [onAuthenticated, session]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!getCustomerAuthToken()) {
      setSession(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchCustomerMe();
        if (!cancelled) {
          setSession(payload);
        }
      } catch (error) {
        // Only a real 401 means the session is invalid — a network/API-down error should
        // leave the stored token alone so the drawer can recover once the API is back.
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setCustomerAuthToken(null);
        }
        if (!cancelled) {
          setSession(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setMembershipStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalMembership();
        if (!cancelled) {
          setMembership(payload);
          setMembershipStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 404) {
          setMembership(null);
          setMembershipStatus("not-found");
        } else if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setMembershipStatus("error");
        } else {
          // API unreachable — fall back to demo portal data rather than a blank crash.
          setMembership(fallbackCustomerPortalMembership);
          setMembershipStatus("success");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, session]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setBenefitsStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalBenefits();
        if (!cancelled) {
          setBenefits(payload);
          setBenefitsStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setBenefitsStatus("error");
        } else {
          setBenefits(fallbackCustomerPortalBenefits);
          setBenefitsStatus("success");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, session]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setTransactionsStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalTransactions({
          limit: PORTAL_TRANSACTIONS_PAGE_SIZE,
          offset: transactionsOffset
        });
        if (!cancelled) {
          setTransactions(payload);
          setTransactionsStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setTransactionsStatus("error");
        } else {
          setTransactions(fallbackCustomerPortalTransactions);
          setTransactionsStatus("success");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, session, transactionsOffset]);

  useEffect(() => {
    if (!open || !session || portalTab !== "sessions") {
      return;
    }

    let cancelled = false;
    setCustomerSessionsStatus("loading");
    setCustomerSessionsError("");

    void (async () => {
      try {
        const payload = await fetchCustomerSessions();
        if (!cancelled) {
          setCustomerSessions(payload);
          setCustomerSessionsStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setCustomerSessionsStatus("error");
          setCustomerSessionsError(
            normalizeError(error, { operation: "load signed-in devices", scope: "customer-auth" }).userMessage
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, portalTab, session]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      const input: CustomerLoginInput = { email: authForm.email, password: authForm.password };
      await loginCustomer(input);
      const payload = await fetchCustomerMe();
      setSession(payload);
      setAuthForm(emptyCustomerAuthForm);
      setAuthStatus("idle");
    } catch (error) {
      setAuthStatus("error");
      setAuthError(normalizeError(error, { operation: "customer sign in", scope: "customer-auth" }).userMessage);
    }
  };

  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      await registerCustomer(authForm);
      const payload = await fetchCustomerMe();
      setSession(payload);
      setAuthForm(emptyCustomerAuthForm);
      setAuthStatus("idle");
    } catch (error) {
      setAuthStatus("error");
      setAuthError(normalizeError(error, { operation: "customer registration", scope: "customer-auth" }).userMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch {
      setCustomerAuthToken(null);
    } finally {
      setSession(null);
      setAuthView("login");
      setPortalTab("transactions");
      setMembership(null);
      setMembershipStatus("idle");
      setBenefits(null);
      setBenefitsStatus("idle");
      setTransactions(null);
      setTransactionsStatus("idle");
      setTransactionsOffset(0);
      setCustomerSessions([]);
      setCustomerSessionsStatus("idle");
      setCustomerSessionsError("");
      setSessionActionId(null);
    }
  };

  const revokeSession = async (sessionId: number) => {
    setSessionActionId(sessionId);
    setCustomerSessionsError("");

    try {
      await logoutCustomerSession(sessionId);
      setCustomerSessions((current) => current.filter((item) => item.id !== sessionId));
    } catch (error) {
      setCustomerSessionsError(
        normalizeError(error, { operation: "log out a device", scope: "customer-auth" }).userMessage
      );
    } finally {
      setSessionActionId(null);
    }
  };

  const revokeOtherSessions = async () => {
    if (!window.confirm("Log out all other devices? This device will stay signed in.")) {
      return;
    }

    setSessionActionId("others");
    setCustomerSessionsError("");

    try {
      await logoutCustomerOtherSessions();
      setCustomerSessions((current) => current.filter((item) => item.is_current));
    } catch (error) {
      setCustomerSessionsError(
        normalizeError(error, { operation: "log out other devices", scope: "customer-auth" }).userMessage
      );
    } finally {
      setSessionActionId(null);
    }
  };

  const runLookup = async (email: string, orderIdInput: string) => {
    const trimmedEmail = email.trim();
    const parsedOrderId = Number.parseInt(orderIdInput, 10);

    if (!trimmedEmail || !Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      setLookupPayload(emptyCustomerLookupPayload);
      setLookupStatus("idle");
      setLookupError("");
      return;
    }

    setLookupStatus("loading");
    setLookupError("");

    try {
      const payload = await onLookupCustomer(trimmedEmail, parsedOrderId);
      setLookupPayload(payload);
      setLookupStatus("success");
    } catch (error) {
      setLookupStatus("error");
      setLookupError(normalizeError(error, { operation: "look up customer orders", scope: "customer-lookup" }).userMessage);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const storedEmail = customerAccountEmail.trim().toLowerCase();
    const autoLookupKey =
      customerAccountOrderId !== null ? `${storedEmail}|${customerAccountOrderId}` : "";

    // Skip when this is the email/order pairing a manual submit (or a prior run of this
    // effect) already fetched, so a successful lookupCustomer call that updates
    // customerAccountEmail/customerAccountOrderId doesn't trigger a second request.
    if (autoLookupKey === (lastAutoLookupKeyRef.current ?? "")) {
      return;
    }

    lastAutoLookupKeyRef.current = autoLookupKey;
    setLookupEmail(storedEmail);
    setLookupOrderId(customerAccountOrderId !== null ? String(customerAccountOrderId) : "");

    if (storedEmail && customerAccountOrderId !== null) {
      void runLookup(storedEmail, String(customerAccountOrderId));
      return;
    }

    setLookupPayload(emptyCustomerLookupPayload);
    setLookupStatus("idle");
    setLookupError("");
  }, [open, customerAccountEmail, customerAccountOrderId]);

  if (!open) {
    return null;
  }

  const normalizedEmail =
    lookupPayload.profile?.customer_email ?? lookupEmail.trim().toLowerCase();
  const profile = lookupPayload.profile;
  const accountOrders = [...lookupPayload.orders].sort(
    (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)
  );
  const hasAccount = profile !== null || accountOrders.length > 0;
  const accountName = profile?.customer_name ?? "My Account";
  const lifetimePurchaseCents =
    profile?.lifetime_purchase_cents ??
    accountOrders.reduce((sum, order) => sum + order.subtotal_cents, 0);
  const totalOrders = profile?.total_orders ?? accountOrders.length;
  const isSearching = lookupStatus === "loading";

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = lookupEmail.trim().toLowerCase();
    lastAutoLookupKeyRef.current = `${trimmedEmail}|${lookupOrderId.trim()}`;
    void runLookup(lookupEmail, lookupOrderId);
  };

  const close = () => {
    onClose();
  };

  if (session) {
    const sessionProfile = session.profile;
    const sessionOrders = [...session.orders].sort(
      (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)
    );

    const membershipProfile = membership?.profile ?? null;
    const sessionLifetimeCents =
      membershipProfile?.lifetime_purchase_cents ??
      sessionProfile?.lifetime_purchase_cents ??
      sessionOrders.reduce((sum, order) => sum + order.subtotal_cents, 0);
    const sessionTotalOrders =
      membershipProfile?.total_orders ?? sessionProfile?.total_orders ?? sessionOrders.length;
    const sessionPointsBalance = membershipProfile?.points_balance ?? sessionProfile?.points_balance ?? 0;
    const sessionLastPurchaseAt = membershipProfile?.last_purchase_at ?? sessionProfile?.last_purchase_at ?? null;
    const membershipTierLabel =
      membershipProfile?.membership_tier ?? sessionProfile?.membership_tier ?? "Online Shopper";

    return (
      <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="My account">
        <button className="cart-scrim" aria-label="Close account" onClick={close} />
        <aside className="cart-drawer account-drawer">
          <header className="cart-drawer-head">
            <h2>My Account</h2>
            <button className="cart-close" onClick={close} aria-label="Close account">
              &times;
            </button>
          </header>

          <div className="account-content">
            <section className="account-hero">
              <p className="eyebrow">{membershipTierLabel}</p>
              <h3>{membershipProfile?.customer_name ?? sessionProfile?.customer_name ?? session.account.display_name}</h3>
              <p>{session.account.email}</p>
            </section>

            <section className="account-stat-grid" aria-label="Account summary">
              <div>
                <span>Points</span>
                <strong>{sessionPointsBalance.toLocaleString()}</strong>
              </div>
              <div>
                <span>Lifetime Spend</span>
                <strong>{currencyFromCents(sessionLifetimeCents)}</strong>
              </div>
              <div>
                <span>Orders</span>
                <strong>{sessionTotalOrders.toLocaleString()}</strong>
              </div>
              <div>
                <span>Last Purchase</span>
                <strong>
                  {sessionLastPurchaseAt
                    ? formatOrderDate(sessionLastPurchaseAt)
                    : sessionOrders[0]
                      ? formatOrderDate(sessionOrders[0].created_at)
                      : "None yet"}
                </strong>
              </div>
            </section>

            <div className="account-portal-tabs" role="tablist" aria-label="Account portal">
              <button
                role="tab"
                aria-selected={portalTab === "transactions"}
                className={`text-link${portalTab === "transactions" ? " active" : ""}`}
                onClick={() => setPortalTab("transactions")}
              >
                Orders & cart history
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "membership"}
                className={`text-link${portalTab === "membership" ? " active" : ""}`}
                onClick={() => setPortalTab("membership")}
              >
                Membership
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "benefits"}
                className={`text-link${portalTab === "benefits" ? " active" : ""}`}
                onClick={() => setPortalTab("benefits")}
              >
                Benefits
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "sessions"}
                className={`text-link${portalTab === "sessions" ? " active" : ""}`}
                onClick={() => setPortalTab("sessions")}
              >
                Sessions
              </button>
            </div>

            {portalTab === "transactions" ? (
              <section className="account-section" aria-label="Transactions">
                <div className="account-section-head">
                  <p className="eyebrow">Orders & cart history</p>
                  <span className="status-pill">
                    {transactions ? `${transactions.total} found` : `${sessionOrders.length} found`}
                  </span>
                </div>

                {transactionsStatus === "loading" && !transactions ? (
                  <p className="account-empty-note">Loading transactions...</p>
                ) : transactionsStatus === "error" ? (
                  <p className="account-empty-note">Unable to load transactions right now.</p>
                ) : transactions && transactions.transactions.length > 0 ? (
                  <>
                    <div className="account-orders">
                      {transactions.transactions.map((transaction) => (
                        <article className="account-order" key={transaction.id}>
                          <div className="account-order-head">
                            <div>
                              <strong>Order #{transaction.id}</strong>
                              <span>{formatOrderDate(transaction.created_at)}</span>
                            </div>
                            <div className="account-order-total">
                              <strong>{currencyFromCents(transaction.total_cents)}</strong>
                              <span>{fulfillmentLabel(transaction.status)}</span>
                            </div>
                          </div>
                          <ul className="account-line-items">
                            {transaction.items.map((item, index) => (
                              <li key={`${transaction.id}-${index}-${item.product_name}`}>
                                <span>{item.product_name}</span>
                                <strong>
                                  {item.quantity} x {currencyFromCents(item.unit_price_cents)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                          {transaction.fulfillment_history.length > 0 ? (
                            <div className="account-fulfillment-timeline" aria-label={`Order ${transaction.id} delivery progress`}>
                              <strong>Delivery progress</strong>
                              <ol>
                                {transaction.fulfillment_history.map((event) => (
                                  <li key={event.id}>
                                    <span>{fulfillmentLabel(event.to_status as FulfillmentStatus)}</span>
                                    <small>{formatOrderDate(event.happened_at)}{event.note ? ` — ${event.note}` : ""}</small>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null}
                          {transaction.applied_offers.length > 0 ? (
                            <ul className="account-payment-list" aria-label="Redeemed offers">
                              {transaction.applied_offers.map((offer, index) => (
                                <li key={`${transaction.id}-offer-${index}`}>
                                  <span>{offer.code ? `Voucher ${offer.code}` : offer.label}</span>
                                  <strong>-{currencyFromCents(offer.discount_cents)}</strong>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {transaction.payments.length > 0 ? (
                            <ul className="account-payment-list">
                              {transaction.payments.map((payment, index) => (
                                <li key={`${transaction.id}-payment-${index}`}>
                                  <span>
                                    {payment.method} &middot; {payment.reference}
                                  </span>
                                  <strong>
                                    {currencyFromCents(payment.amount_cents)} &middot; {payment.status}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    <div className="account-pagination">
                      <button
                        className="outline-button"
                        disabled={transactionsOffset === 0 || transactionsStatus === "loading"}
                        onClick={() =>
                          setTransactionsOffset((current) =>
                            Math.max(0, current - PORTAL_TRANSACTIONS_PAGE_SIZE)
                          )
                        }
                      >
                        Previous
                      </button>
                      <span>
                        {transactions.total === 0
                          ? "0 of 0"
                          : `${transactionsOffset + 1}-${Math.min(
                              transactionsOffset + PORTAL_TRANSACTIONS_PAGE_SIZE,
                              transactions.total
                            )} of ${transactions.total}`}
                      </span>
                      <button
                        className="outline-button"
                        disabled={
                          transactionsStatus === "loading" ||
                          transactionsOffset + PORTAL_TRANSACTIONS_PAGE_SIZE >= transactions.total
                        }
                        onClick={() =>
                          setTransactionsOffset((current) => current + PORTAL_TRANSACTIONS_PAGE_SIZE)
                        }
                      >
                        Load more
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="account-empty-note">No transactions are attached to this account yet.</p>
                )}
              </section>
            ) : null}

            {portalTab === "membership" ? (
              <section className="account-section" aria-label="Membership">
                {membershipStatus === "loading" && !membership ? (
                  <p className="account-empty-note">Loading membership details...</p>
                ) : membershipStatus === "not-found" ? (
                  <p className="account-empty-note">No membership profile is linked to this account yet.</p>
                ) : membershipStatus === "error" ? (
                  <p className="account-empty-note">Unable to load membership details right now.</p>
                ) : membership ? (
                  <div className="membership-panel">
                    <div className="membership-current">
                      <p className="eyebrow">Current tier</p>
                      <h3>{membership.current_tier?.name ?? membership.profile.membership_tier}</h3>
                    </div>
                    <dl className="membership-stats">
                      <div>
                        <dt>Points balance</dt>
                        <dd>{membership.profile.points_balance.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Lifetime spend</dt>
                        <dd>{currencyFromCents(membership.profile.lifetime_purchase_cents)}</dd>
                      </div>
                      <div>
                        <dt>Total orders</dt>
                        <dd>{membership.profile.total_orders.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Last purchase</dt>
                        <dd>
                          {membership.profile.last_purchase_at
                            ? formatOrderDate(membership.profile.last_purchase_at)
                            : "None yet"}
                        </dd>
                      </div>
                    </dl>

                    {membership.next_tier ? (
                      <div className="membership-progress">
                        <div className="membership-progress-head">
                          <span>Progress to {membership.next_tier.name}</span>
                          <span>{currencyFromCents(membership.next_tier.remaining_cents)} to go</span>
                        </div>
                        <div className="membership-progress-bar">
                          <div
                            className="membership-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((membership.next_tier.min_lifetime_purchase_cents -
                                    membership.next_tier.remaining_cents) /
                                    membership.next_tier.min_lifetime_purchase_cents) *
                                    100
                                )
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="account-empty-note">You have reached the top membership tier.</p>
                    )}
                  </div>
                ) : (
                  <p className="account-empty-note">No membership profile is linked to this account yet.</p>
                )}
              </section>
            ) : null}

            {portalTab === "benefits" ? (
              <section className="account-section" aria-label="Benefits">
                {benefitsStatus === "loading" && !benefits ? (
                  <p className="account-empty-note">Loading benefits...</p>
                ) : benefitsStatus === "error" ? (
                  <p className="account-empty-note">Unable to load benefits right now.</p>
                ) : benefits && benefits.tiers.length > 0 ? (
                  <div className="benefit-tier-list">
                    {benefits.tiers.map((tier) => {
                      const isCurrentTier =
                        benefits.current_tier?.toLowerCase() === tier.name.toLowerCase();
                      return (
                        <article
                          className={`benefit-tier${isCurrentTier ? " current" : ""}`}
                          key={tier.name}
                        >
                          <div className="benefit-tier-head">
                            <h4>{tier.name}</h4>
                            {isCurrentTier ? <span className="status-pill">Your tier</span> : null}
                          </div>
                          <ul className="benefit-list">
                            {tier.benefits.map((benefit) => (
                              <li key={`${tier.name}-${benefit.title}`}>
                                <strong>{benefit.title}</strong>
                                {benefit.description ? <span>{benefit.description}</span> : null}
                              </li>
                            ))}
                          </ul>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="account-empty-note">No benefit tiers are available right now.</p>
                )}
              </section>
            ) : null}

            {portalTab === "sessions" ? (
              <section className="account-section" aria-label="Signed-in devices">
                <div className="account-section-head">
                  <div>
                    <p className="eyebrow">Account security</p>
                    <h3>Signed-in devices</h3>
                  </div>
                  {customerSessions.some((item) => !item.is_current) ? (
                    <button
                      className="text-link"
                      disabled={sessionActionId !== null}
                      onClick={() => void revokeOtherSessions()}
                    >
                      Log out others
                    </button>
                  ) : null}
                </div>

                {customerSessionsStatus === "loading" ? (
                  <p className="account-empty-note">Loading signed-in devices...</p>
                ) : customerSessionsStatus === "error" ? (
                  <p className="account-empty-note">{customerSessionsError || "Unable to load signed-in devices."}</p>
                ) : customerSessions.length === 0 ? (
                  <p className="account-empty-note">No active sessions were found.</p>
                ) : (
                  <div className="customer-session-list">
                    {customerSessions.map((item) => (
                      <article className="customer-session" key={item.id}>
                        <div>
                          <strong>{customerSessionDeviceLabel(item.user_agent)}</strong>
                          <span>
                            {item.is_current
                              ? "This device"
                              : `Last active ${formatRelativeTime(item.last_seen_at)}`}
                          </span>
                        </div>
                        {item.is_current ? (
                          <span className="status-pill">Current</span>
                        ) : (
                          <button
                            className="outline-button"
                            disabled={sessionActionId !== null}
                            onClick={() => void revokeSession(item.id)}
                          >
                            {sessionActionId === item.id ? "Logging out..." : "Log out"}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <button className="outline-button" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="My account">
      <button className="cart-scrim" aria-label="Close account" onClick={close} />
      <aside className="cart-drawer account-drawer">
        <header className="cart-drawer-head">
          <h2>My Account</h2>
          <button className="cart-close" onClick={close} aria-label="Close account">
            &times;
          </button>
        </header>

        <div className="account-auth-tabs">
          <button
            className={`text-link${authView === "login" ? " active" : ""}`}
            onClick={() => {
              setAuthView("login");
              setAuthError("");
            }}
          >
            Sign in
          </button>
          <button
            className={`text-link${authView === "register" ? " active" : ""}`}
            onClick={() => {
              setAuthView("register");
              setAuthError("");
            }}
          >
            Create account
          </button>
          <button
            className={`text-link${authView === "guest" ? " active" : ""}`}
            onClick={() => {
              setAuthView("guest");
              setAuthError("");
            }}
          >
            Look up a guest order
          </button>
        </div>

        {authView === "login" ? (
          <form className="account-lookup-form" onSubmit={(event) => void submitLogin(event)}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </label>
            <button className="solid-button" disabled={authStatus === "loading"}>
              {authStatus === "loading" ? "Signing in..." : "Sign in"}
            </button>
            {authStatus === "error" ? <p className="cart-feedback">{authError}</p> : null}
          </form>
        ) : authView === "register" ? (
          <form className="account-lookup-form" onSubmit={(event) => void submitRegister(event)}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={authForm.display_name}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, display_name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                minLength={8}
                required
              />
            </label>
            <button className="solid-button" disabled={authStatus === "loading"}>
              {authStatus === "loading" ? "Creating account..." : "Create account"}
            </button>
            {authStatus === "error" ? <p className="cart-feedback">{authError}</p> : null}
          </form>
        ) : (
          <>
            <form className="account-lookup-form" onSubmit={submitLookup}>
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  placeholder="orders@example.com"
                  required
                />
              </label>
              <label>
                <span>Order #</span>
                <input
                  type="number"
                  value={lookupOrderId}
                  onChange={(event) => setLookupOrderId(event.target.value)}
                  placeholder="e.g. 1024"
                  min={1}
                  required
                />
              </label>
              <button className="solid-button" disabled={isSearching}>
                {isSearching ? "Searching..." : "Find my orders"}
              </button>
              {lookupStatus === "error" ? <p className="cart-feedback">{lookupError}</p> : null}
            </form>

            {isSearching && !hasAccount ? (
              <div className="cart-empty account-empty">
                <p>Looking up recent orders...</p>
              </div>
            ) : hasAccount ? (
              <div className="account-content">
                <section className="account-hero">
                  <p className="eyebrow">{profile?.membership_tier ?? "Online Shopper"}</p>
                  <h3>{accountName}</h3>
                  <p>{normalizedEmail}</p>
                </section>

                <section className="account-stat-grid" aria-label="Account summary">
                  <div>
                    <span>Points</span>
                    <strong>{(profile?.points_balance ?? 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Lifetime Spend</span>
                    <strong>{currencyFromCents(lifetimePurchaseCents)}</strong>
                  </div>
                  <div>
                    <span>Orders</span>
                    <strong>{totalOrders.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Last Purchase</span>
                    <strong>
                      {profile?.last_purchase_at
                        ? formatOrderDate(profile.last_purchase_at)
                        : accountOrders[0]
                          ? formatOrderDate(accountOrders[0].created_at)
                          : "None yet"}
                    </strong>
                  </div>
                </section>

                <section className="account-section">
                  <div className="account-section-head">
                    <p className="eyebrow">Recent Orders</p>
                    <span className="status-pill">{accountOrders.length} found</span>
                  </div>
                  {accountOrders.length > 0 ? (
                    <div className="account-orders">
                      {accountOrders.map((order) => (
                        <article className="account-order" key={order.id}>
                          <div className="account-order-head">
                            <div>
                              <strong>Order #{order.id}</strong>
                              <span>{formatOrderDate(order.created_at)}</span>
                            </div>
                            <div className="account-order-total">
                              <strong>{currencyFromCents(order.subtotal_cents)}</strong>
                              <span>{fulfillmentLabel(order.fulfillment_status)}</span>
                            </div>
                          </div>
                          <ul className="account-line-items">
                            {order.items.map((item, index) => (
                              <li key={`${order.id}-${index}-${item.product_name}`}>
                                <span>{item.product_name}</span>
                                <strong>
                                  {item.quantity} x {currencyFromCents(item.unit_price_cents)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="account-empty-note">No storefront orders are attached to this email yet.</p>
                  )}
                </section>
              </div>
            ) : (
              <div className="cart-empty account-empty">
                <p>
                  {lookupStatus === "success"
                    ? "No orders found for this email."
                    : "No customer account is active yet."}
                </p>
                <button className="outline-button" onClick={close}>
                  Continue Shopping
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

type CartDrawerProps = {
  cart: CartItem[];
  customerAccountEmail: string;
  open: boolean;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onClose: () => void;
  onCompleted: () => void;
  onPromotionChange: (promotionId: number | null) => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onVoucherCodeChange: (code: string) => void;
  publicOffers: PublicOffersPayload | null;
  selectedPromotionId: number | null;
  voucherCode: string;
};

function CartDrawer({
  cart,
  customerAccountEmail,
  open,
  onCheckout,
  onClose,
  onCompleted,
  onPromotionChange,
  onRemoveFromCart,
  onUpdateQuantity,
  onVoucherCodeChange,
  publicOffers,
  selectedPromotionId,
  voucherCode
}: CartDrawerProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<{
    customer_name: string;
    customer_email: string;
    fulfillment_method: FulfillmentMethod;
  }>({ customer_name: "", customer_email: "", fulfillment_method: "pickup" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteFeedback, setQuoteFeedback] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const email = customerAccountEmail.trim();
    if (!email) {
      return;
    }

    setForm((current) => {
      if (current.customer_email.trim()) {
        return current;
      }

      return { ...current, customer_email: email };
    });
  }, [customerAccountEmail, open]);

  useEffect(() => {
    if (!open || cart.length === 0) {
      setQuote(null);
      setQuoteFeedback(null);
      setIsQuoting(false);
      return;
    }

    let cancelled = false;
    setQuote(null);
    setQuoteFeedback(null);
    setIsQuoting(true);

    const timeout = window.setTimeout(() => {
      void quoteCheckout({
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        promotion_id: selectedPromotionId ?? undefined,
        voucher_code: voucherCode.trim() || undefined
      })
        .then((nextQuote) => {
          if (!cancelled) {
            setQuote(nextQuote);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setQuoteFeedback(
              normalizeError(error, {
                operation: "calculate checkout total",
                scope: "checkout"
              }).userMessage
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsQuoting(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [cart, open, selectedPromotionId, voucherCode]);

  if (!open) {
    return null;
  }

  const subtotalCents = cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);
  const eligiblePromotions =
    publicOffers?.promotions.filter(
      (promotion) => subtotalCents >= promotion.minimum_subtotal_cents
    ) ?? [];
  const eligibleVouchers =
    publicOffers?.vouchers.filter((voucher) => subtotalCents >= voucher.minimum_subtotal_cents) ?? [];

  const close = () => {
    setStage("cart");
    setForm({ customer_name: "", customer_email: "", fulfillment_method: "pickup" });
    setFeedback(null);
    setConfirmedOrder(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const order = await onCheckout({
        customer_name: form.customer_name,
      customer_email: form.customer_email,
      fulfillment_method: form.fulfillment_method,
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        promotion_id: selectedPromotionId ?? undefined,
        voucher_code: voucherCode.trim() || undefined
      });
      setConfirmedOrder(order);
      onCompleted();
    } catch (error) {
      setFeedback(normalizeError(error, { operation: "checkout", scope: "checkout" }).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  let title = t("shop.cartd.title");
  if (confirmedOrder) {
    title = "Order Confirmed";
  } else if (stage === "checkout") {
    title = "Checkout";
  }

  const renderTotals = () => {
    if (!quote) {
      return (
        <div className="cart-subtotal">
          <span>{t("shop.cartd.subtotal")}</span>
          <strong>{currencyFromCents(subtotalCents)}</strong>
        </div>
      );
    }

    return (
      <>
        <div className="cart-subtotal">
          <span>Subtotal</span>
          <strong>{currencyFromCents(quote.subtotal_cents)}</strong>
        </div>
        {quote.discount_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>Discount</span>
            <strong>-{currencyFromCents(quote.discount_cents)}</strong>
          </div>
        ) : null}
        {quote.tax_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>Tax</span>
            <strong>{currencyFromCents(quote.tax_cents)}</strong>
          </div>
        ) : null}
        <div className="cart-subtotal">
          <span>Total</span>
          <strong>{currencyFromCents(quote.total_cents)}</strong>
        </div>
      </>
    );
  };

  return (
    <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="cart-scrim" aria-label={t("shop.cartd.close")} onClick={close} />
      <aside className="cart-drawer">
        <header className="cart-drawer-head">
          <h2>{title}</h2>
          <button className="cart-close" onClick={close} aria-label="Close cart">
            &times;
          </button>
        </header>

        {confirmedOrder ? (
          <div className="cart-confirmation">
            <p className="cart-confirm-badge">Order #{confirmedOrder.id}</p>
            <p>
              Thanks, {confirmedOrder.customer_name}! A confirmation is on its way to{" "}
              {confirmedOrder.customer_email}.
            </p>
            <p className="cart-confirm-total">
              {currencyFromCents(confirmedOrder.total_cents ?? confirmedOrder.subtotal_cents)} total
            </p>
            <p>{fulfillmentLabel(confirmedOrder.fulfillment_method)} order</p>
            <button className="solid-button" onClick={close}>
              Continue Shopping
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty">
            <p>{t("shop.cartd.empty")}</p>
            <button className="outline-button" onClick={close}>
              Browse products
            </button>
          </div>
        ) : stage === "cart" ? (
          <>
            <ul className="cart-lines">
              {cart.map((item) => (
                <li className="cart-line" key={item.product.id}>
                  <div
                    className={"cart-line-visual" + (item.product.image_url ? "" : " tone-fallback")}
                  >
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const parent = event.currentTarget.parentElement;
                          if (parent) parent.classList.add("tone-fallback");
                        }}
                      />
                    ) : (
                      <span>{item.product.tone}</span>
                    )}
                  </div>
                  <div className="cart-line-body">
                    <div className="cart-line-info">
                      <strong>{item.product.name}</strong>
                      <span>{currencyFromCents(item.product.price_cents)} each</span>
                    </div>
                    <div className="cart-line-controls">
                      <div className="qty-stepper">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          &minus;
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <strong>{currencyFromCents(item.product.price_cents * item.quantity)}</strong>
                      <button className="cart-remove" onClick={() => onRemoveFromCart(item.product.id)}>
                        {t("shop.cartd.remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <section className="cart-checkout-form" aria-labelledby="cart-deals-title">
              <h3 id="cart-deals-title">Deals &amp; vouchers</h3>
              <label>
                <span>Promotion</span>
                <select
                  aria-label="Select a promotion"
                  onChange={(event) =>
                    onPromotionChange(event.target.value ? Number(event.target.value) : null)
                  }
                  value={selectedPromotionId ?? ""}
                >
                  <option value="">No promotion</option>
                  {eligiblePromotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.label}: {promotion.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPromotionId !== null ? (
                <button
                  className="outline-button"
                  onClick={() => onPromotionChange(null)}
                  type="button"
                >
                  Remove selected promotion
                </button>
              ) : null}
              <label>
                <span>Voucher code</span>
                <input
                  aria-label="Voucher code"
                  onChange={(event) => onVoucherCodeChange(event.target.value)}
                  placeholder="Enter voucher code"
                  value={voucherCode}
                />
              </label>
              {voucherCode.trim() ? (
                <button
                  className="outline-button"
                  onClick={() => onVoucherCodeChange("")}
                  type="button"
                >
                  Remove voucher
                </button>
              ) : null}
              {eligibleVouchers.length ? (
                <div>
                  <strong>Public vouchers</strong>
                  <div className="cart-checkout-actions">
                    {eligibleVouchers.map((voucher) => (
                      <button
                        aria-label={`Apply public voucher ${voucher.code}`}
                        className="outline-button"
                        disabled={isQuoting}
                        key={voucher.id}
                        onClick={() => onVoucherCodeChange(voucher.code)}
                        type="button"
                      >
                        Apply {voucher.code}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {isQuoting ? <p className="cart-feedback">Updating checkout total…</p> : null}
              {quoteFeedback ? (
                <p className="cart-feedback" role="alert">
                  {quoteFeedback}
                </p>
              ) : null}
            </section>
            <footer className="cart-drawer-foot">
              {renderTotals()}
              <button
                className="solid-button"
                disabled={isQuoting}
                onClick={() => setStage("checkout")}
              >
                Proceed to Checkout
              </button>
            </footer>
          </>
        ) : (
          <form className="cart-checkout-form" onSubmit={handleSubmit}>
            <label>
              <span>Full name</span>
              <input
                value={form.customer_name}
                onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.customer_email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>Fulfillment</span>
              <select
                value={form.fulfillment_method}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fulfillment_method: event.target.value as FulfillmentMethod
                  }))
                }
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            {feedback ? <p className="cart-feedback">{feedback}</p> : null}
            {isQuoting ? <p className="cart-feedback">Updating checkout total…</p> : null}
            {quoteFeedback ? (
              <p className="cart-feedback" role="alert">
                {quoteFeedback}
              </p>
            ) : null}
            {renderTotals()}
            <div className="cart-checkout-actions">
              <button type="button" className="outline-button" onClick={() => setStage("cart")}>
                Back to cart
              </button>
              <button type="submit" className="solid-button" disabled={isSubmitting || isQuoting}>
                {isSubmitting ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

type AdminViewProps = {
  activityFeed: ActivityItem[];
  activeRoleId: number | null;
  adminTab: AdminTab;
  adminUsers: AdminUser[];
  categories: Category[];
  currentAdmin: AdminMePayload | null;
  customerProfiles: CustomerPortalProfile[];
  dashboard: AdminDashboardPayload;
  demoMode: boolean;
  hasMoreCustomerProfiles: boolean;
  hasMoreActivity: boolean;
  hasMoreInvoices: boolean;
  hasMoreOrders: boolean;
  hasMoreSales: boolean;
  isChangePasswordOpen: boolean;
  isLoadingMoreActivity: boolean;
  isLoadingMoreCustomerProfiles: boolean;
  isLoadingMoreInvoices: boolean;
  isLoadingMoreOrders: boolean;
  isLoadingMoreSales: boolean;
  onBackToStore: () => void;
  onChangeOwnPassword: (input: ChangeOwnPasswordInput) => Promise<void>;
  onChangeTab: (tab: AdminTab) => void;
  onCloseChangePassword: () => void;
  onLoadMoreActivity: () => void;
  onCreateAdminOrder: (input: CreateOrderInput) => Promise<Order>;
  onCreateAdminUser: (input: CreateAdminUserInput) => Promise<AdminUser>;
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>;
  onCreateCustomerPortalProfile: (
    input: CreateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onCreateInvoiceFromOrder: (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ) => Promise<Invoice>;
  onCreatePayment: (input: CreatePaymentInput) => Promise<Payment>;
  onCreateProduct: (input: CreateProductInput) => Promise<Product>;
  onCreatePromotion: (input: CreatePromotionInput) => Promise<Promotion>;
  onCreateRole: (input: CreateRoleInput) => Promise<Role>;
  onCreateVoucher: (input: CreateVoucherInput) => Promise<Voucher>;
  onDeleteAdminOrder: (orderId: number) => Promise<void>;
  onDeleteCategory: (slug: string) => Promise<void>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onDeletePromotion: (promotionId: number) => Promise<void>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onDeleteVoucher: (voucherId: number) => Promise<void>;
  onExportAutoCountInvoices: (input: AutoCountExportInput) => Promise<void>;
  onLogout: () => void;
  onLoadMoreCustomerProfiles: () => void;
  onLoadMoreInvoices: () => void;
  onLoadMoreOrders: () => void;
  onLoadMoreSales: () => void;
  onOpenChangePassword: () => void;
  onRecordInvoicePayment: (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ) => Promise<Invoice>;
  onResetAdminUserPassword: (userId: number, input: AdminResetPasswordInput) => Promise<void>;
  onRunSync: () => void;
  onSetAdminUserActive: (userId: number, input: SetAdminUserActiveInput) => Promise<AdminUser>;
  onUpdateAdminOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  onUpdateAdminUserProfile: (
    userId: number,
    input: UpdateAdminUserProfileInput
  ) => Promise<AdminUser>;
  onUpdateCategory: (slug: string, input: UpdateCategoryInput) => Promise<Category>;
  onUpdateCustomerPortalProfile: (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onUpdateInvoiceBilling: (invoiceId: number, input: UpdateInvoiceBillingInput) => Promise<Invoice>;
  onUpdatePayment: (paymentId: number, input: UpdatePaymentInput) => Promise<Payment>;
  onUpdateProduct: (productId: number, input: UpdateProductInput) => Promise<Product>;
  onUpdatePromotion: (promotionId: number, input: UpdatePromotionInput) => Promise<Promotion>;
  onUpdateOrderFulfillment: (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ) => Promise<Order>;
  onUpdateRole: (roleId: number, input: UpdateRoleInput) => Promise<Role>;
  onUpdateRolePermission: (input: UpdateRolePagePermissionInput) => Promise<RolePagePermission>;
  onUpdateSalesDetails: (orderId: number, input: UpdateSalesDetailsInput) => Promise<SalesRecord>;
  onUpdateSalesStatus: (orderId: number, input: UpdateSalesStatusInput) => Promise<SalesRecord>;
  onUpdateSystemSetting: (key: string, input: UpdateSystemSettingInput) => Promise<SystemSetting>;
  onUpdateVoucher: (voucherId: number, input: UpdateVoucherInput) => Promise<Voucher>;
  onVoidInvoice: (invoiceId: number) => Promise<Invoice>;
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
  sales: SalesRecord[];
  salesSummary: SalesSummaryPayload | null;
  systemSettings: SystemSetting[];
  permissions: PermissionsPayload | null;
  products: Product[];
  promotions: Promotion[];
  vouchers: Voucher[];
};

function AdminView({
  activityFeed,
  activeRoleId,
  adminTab,
  adminUsers,
  categories,
  currentAdmin,
  customerProfiles,
  dashboard,
  demoMode,
  hasMoreCustomerProfiles,
  hasMoreActivity,
  hasMoreInvoices,
  hasMoreOrders,
  hasMoreSales,
  isChangePasswordOpen,
  isLoadingMoreActivity,
  isLoadingMoreCustomerProfiles,
  isLoadingMoreInvoices,
  isLoadingMoreOrders,
  isLoadingMoreSales,
  onBackToStore,
  onChangeOwnPassword,
  onChangeTab,
  onCloseChangePassword,
  onLoadMoreActivity,
  onCreateAdminOrder,
  onCreateAdminUser,
  onCreateCategory,
  onCreateCustomerPortalProfile,
  onCreateInvoiceFromOrder,
  onCreatePayment,
  onCreateProduct,
  onCreatePromotion,
  onCreateRole,
  onCreateVoucher,
  onDeleteAdminOrder,
  onDeleteCategory,
  onDeleteCustomerPortalProfile,
  onDeletePayment,
  onDeleteProduct,
  onDeletePromotion,
  onDeleteRole,
  onDeleteVoucher,
  onExportAutoCountInvoices,
  onLogout,
  onLoadMoreCustomerProfiles,
  onLoadMoreInvoices,
  onLoadMoreOrders,
  onLoadMoreSales,
  onOpenChangePassword,
  onRecordInvoicePayment,
  onResetAdminUserPassword,
  onRunSync,
  onSetAdminUserActive,
  onUpdateAdminOrder,
  onUpdateAdminUserProfile,
  onUpdateCategory,
  onUpdateCustomerPortalProfile,
  onUpdateInvoiceBilling,
  onUpdatePayment,
  onUpdateProduct,
  onUpdatePromotion,
  onUpdateOrderFulfillment,
  onUpdateRole,
  onUpdateRolePermission,
  onUpdateSalesDetails,
  onUpdateSalesStatus,
  onUpdateSystemSetting,
  onUpdateVoucher,
  onVoidInvoice,
  orders,
  payments,
  invoices,
  sales,
  salesSummary,
  systemSettings,
  permissions,
  products,
  promotions,
  vouchers
}: AdminViewProps) {
  const { notify, notifyError } = useNotifications();
  const [permissionEditorRoleId, setPermissionEditorRoleId] = useState<number | null>(activeRoleId);
  const [changePasswordForm, setChangePasswordForm] = useState<ChangeOwnPasswordInput>({
    current_password: "",
    new_password: ""
  });
  const [isSavingChangePassword, setIsSavingChangePassword] = useState(false);
  const activeRole = currentAdmin?.role ?? permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canCreateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "create");
  const canUpdateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "update");
  const canDeleteCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "delete");
  const canCreateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "create");
  const canUpdateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "update");
  const canDeleteCustomers = canAccess(permissions, activeRoleId, "admin-customers", "delete");
  const canReadSupport = canAccess(permissions, activeRoleId, "admin-support", "read");
  const canUpdateSupport = canAccess(permissions, activeRoleId, "admin-support", "update");
  const canCreateOrders = canAccess(permissions, activeRoleId, "admin-orders", "create");
  const canUpdateOrders = canAccess(permissions, activeRoleId, "admin-orders", "update");
  const canDeleteOrders = canAccess(permissions, activeRoleId, "admin-orders", "delete");
  const canCreatePayments = canAccess(permissions, activeRoleId, "admin-payments", "create");
  const canUpdatePayments = canAccess(permissions, activeRoleId, "admin-payments", "update");
  const canDeletePayments = canAccess(permissions, activeRoleId, "admin-payments", "delete");
  const canUpdateSales = canAccess(permissions, activeRoleId, "admin-sales", "update");
  const canCreateInvoices = canAccess(permissions, activeRoleId, "admin-invoices", "create");
  const canUpdateInvoices = canAccess(permissions, activeRoleId, "admin-invoices", "update");
  const canUpdateSettings = canAccess(permissions, activeRoleId, "admin-settings", "update");
  const canCreateCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "create");
  const canUpdateCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "update");
  const canDeleteCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "delete");
  const canRunOperationsSync = canAccess(permissions, activeRoleId, "admin-overview", "update");
  const canCreateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "create");
  const canUpdateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "update");

  const handleChangeOwnPassword = async () => {
    setIsSavingChangePassword(true);

    try {
      await onChangeOwnPassword(changePasswordForm);
      setChangePasswordForm({ current_password: "", new_password: "" });
      onCloseChangePassword();
      notify({ severity: "success", title: "Password changed", message: "Your password was changed successfully.", scope: "admin-account", dedupeKey: "admin-account:password:success" });
    } catch (error) {
      notifyError(error, { operation: "change own password", scope: "admin-account", dedupeKey: "admin-account:password:error" });
    } finally {
      setIsSavingChangePassword(false);
    }
  };

  useEffect(() => {
    if (!permissions || permissions.roles.length === 0) {
      return;
    }

    setPermissionEditorRoleId((current) =>
      current !== null && permissions.roles.some((role) => role.id === current)
        ? current
        : permissions.roles[0].id
    );
  }, [permissions]);

  useEffect(() => {
    const currentTab = adminTabs.find((item) => item.tab === adminTab);

    if (!currentTab || canAccess(permissions, activeRoleId, currentTab.pageSlug, "read")) {
      return;
    }

    const nextTab = adminTabs.find((item) =>
      canAccess(permissions, activeRoleId, item.pageSlug, "read")
    );

    if (nextTab) {
      onChangeTab(nextTab.tab);
    }
  }, [activeRoleId, adminTab, onChangeTab, permissions]);

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <EkowayMark compact />
          <div>
            <p className="eyebrow">Internal Retail Tools</p>
            <h1>OPT Console</h1>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {adminTabs.map(({ tab, label, pageSlug }) => {
            const canReadTab = canAccess(permissions, activeRoleId, pageSlug, "read");

            return (
              <button
                key={tab}
                className={`admin-nav-item ${adminTab === tab ? "active" : ""}`}
                disabled={!canReadTab}
                onClick={() => onChangeTab(tab)}
              >
                <span>{label}</span>
                {!canReadTab ? <small>Locked</small> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">{demoMode ? "Demo mode" : "Signed in"}</p>
          <h3>{currentAdmin?.user.display_name ?? "Read-only demo"}</h3>
          <p>{activeRole?.name ?? "Fallback data"} access</p>
          <p>{activeRole?.description ?? "The API is unreachable, so live writes are disabled."}</p>
          {activeRole?.is_super_admin ? <span className="status-pill live">Ultimate access</span> : null}
          {demoMode ? <span className="status-pill warning">Fallback</span> : null}
          {!demoMode ? (
            <button className="outline-button" onClick={onOpenChangePassword}>
              Change Password
            </button>
          ) : null}
        </div>

        <button className="outline-button" onClick={onBackToStore}>
          Back to Storefront
        </button>
        {!demoMode ? (
          <button className="outline-button" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </aside>

      <section className="admin-main">
        {adminTab !== "overview" ? <header className="admin-topbar">
          <div><p className="eyebrow">Store operations</p><h2>{adminTabs.find((item) => item.tab === adminTab)?.label}</h2></div>
          <div className="admin-actions"><button className="solid-button" disabled={!canRunOperationsSync} onClick={onRunSync}>Refresh data</button></div>
        </header> : null}

        {demoMode && adminTab !== "overview" ? (
          <p className="admin-demo-banner">
            API unreachable. Showing fallback admin data with write controls disabled.
          </p>
        ) : null}

        {adminTab === "overview" ? (
          <OperationsConsole
            activity={activityFeed}
            canRefresh={canRunOperationsSync}
            dashboard={dashboard}
            demoMode={demoMode}
            onOpenFulfillment={() => onChangeTab("fulfillment")}
            onOpenOrders={() => onChangeTab("orders")}
            onOpenPayments={() => onChangeTab("payments")}
            onRefresh={onRunSync}
            orders={orders}
            payments={payments}
          />
        ) : null}

        {adminTab === "inventory" ? (
          <CatalogPanel
            canCreate={canCreateCatalog}
            canDelete={canDeleteCatalog}
            canUpdate={canUpdateCatalog}
            categories={categories}
            onCreateCategory={onCreateCategory}
            onCreateProduct={onCreateProduct}
            onDeleteCategory={onDeleteCategory}
            onDeleteProduct={onDeleteProduct}
            onUpdateCategory={onUpdateCategory}
            onUpdateProduct={onUpdateProduct}
            products={products}
            variant="inventory"
          />
        ) : null}

        {adminTab === "fulfillment" ? (
          <OrderControlPanel
            canCreate={canCreateOrders}
            canDelete={canDeleteOrders}
            canUpdate={canUpdateOrders}
            hasMore={hasMoreOrders}
            isLoadingMore={isLoadingMoreOrders}
            onCreateOrder={onCreateAdminOrder}
            onDeleteOrder={onDeleteAdminOrder}
            onLoadMore={onLoadMoreOrders}
            onUpdateOrder={onUpdateAdminOrder}
            onUpdateFulfillment={onUpdateOrderFulfillment}
            orders={orders}
            products={products}
            variant="fulfillment"
          />
        ) : null}

        {adminTab === "campaigns" ? (
          <OfferManagementPanel
            canCreate={canCreateCampaigns}
            canDelete={canDeleteCampaigns}
            canUpdate={canUpdateCampaigns}
            demoMode={demoMode}
            onCreatePromotion={onCreatePromotion}
            onCreateVoucher={onCreateVoucher}
            onDeletePromotion={onDeletePromotion}
            onDeleteVoucher={onDeleteVoucher}
            onUpdatePromotion={onUpdatePromotion}
            onUpdateVoucher={onUpdateVoucher}
            promotions={promotions}
            vouchers={vouchers}
          />
        ) : null}

        {adminTab === "catalog" ? (
          <CatalogPanel
            canCreate={canCreateCatalog}
            canDelete={canDeleteCatalog}
            canUpdate={canUpdateCatalog}
            categories={categories}
            onCreateCategory={onCreateCategory}
            onCreateProduct={onCreateProduct}
            onDeleteCategory={onDeleteCategory}
            onDeleteProduct={onDeleteProduct}
            onUpdateCategory={onUpdateCategory}
            onUpdateProduct={onUpdateProduct}
            products={products}
          />
        ) : null}

        {adminTab === "customers" ? (
          <CustomerPortalPanel
            canCreate={canCreateCustomers}
            canDelete={canDeleteCustomers}
            canUpdate={canUpdateCustomers}
            hasMore={hasMoreCustomerProfiles}
            isLoadingMore={isLoadingMoreCustomerProfiles}
            onCreateCustomerPortalProfile={onCreateCustomerPortalProfile}
            onDeleteCustomerPortalProfile={onDeleteCustomerPortalProfile}
            onLoadMore={onLoadMoreCustomerProfiles}
            onUpdateCustomerPortalProfile={onUpdateCustomerPortalProfile}
            orders={orders}
            profiles={customerProfiles}
          />
        ) : null}

        {adminTab === "support" && canReadSupport ? (
          <SupportInboxPanel
            canUpdate={canUpdateSupport}
            currentAdminUserId={currentAdmin?.user.id ?? null}
          />
        ) : null}

        {adminTab === "orders" ? (
          <OrderControlPanel
            canCreate={canCreateOrders}
            canDelete={canDeleteOrders}
            canUpdate={canUpdateOrders}
            hasMore={hasMoreOrders}
            isLoadingMore={isLoadingMoreOrders}
            onCreateOrder={onCreateAdminOrder}
            onDeleteOrder={onDeleteAdminOrder}
            onLoadMore={onLoadMoreOrders}
            onUpdateOrder={onUpdateAdminOrder}
            onUpdateFulfillment={onUpdateOrderFulfillment}
            orders={orders}
            products={products}
          />
        ) : null}

        {adminTab === "payments" ? (
          <PaymentManagementPanel
            canCreate={canCreatePayments}
            canDelete={canDeletePayments}
            canUpdate={canUpdatePayments}
            onCreatePayment={onCreatePayment}
            onDeletePayment={onDeletePayment}
            onUpdatePayment={onUpdatePayment}
            orders={orders}
            payments={payments}
          />
        ) : null}

        {adminTab === "sales" ? (
          <SalesPanel
            canUpdate={canUpdateSales}
            hasMore={hasMoreSales}
            isLoadingMore={isLoadingMoreSales}
            onLoadMore={onLoadMoreSales}
            onUpdateSalesDetails={onUpdateSalesDetails}
            onUpdateSalesStatus={onUpdateSalesStatus}
            sales={sales}
            summary={salesSummary}
          />
        ) : null}

        {adminTab === "invoices" ? (
          <InvoicesPanel
            canCreate={canCreateInvoices}
            canUpdate={canUpdateInvoices}
            hasMore={hasMoreInvoices}
            invoices={invoices}
            isLoadingMore={isLoadingMoreInvoices}
            onCreateInvoiceFromOrder={onCreateInvoiceFromOrder}
            onExportAutoCountInvoices={onExportAutoCountInvoices}
            onLoadMore={onLoadMoreInvoices}
            onRecordInvoicePayment={onRecordInvoicePayment}
            onUpdateInvoiceBilling={onUpdateInvoiceBilling}
            onVoidInvoice={onVoidInvoice}
            orders={orders}
            settings={systemSettings}
          />
        ) : null}

        {adminTab === "settings" ? (
          <SettingsPanel
            canUpdate={canUpdateSettings}
            onUpdateSetting={onUpdateSystemSetting}
            settings={systemSettings}
          />
        ) : null}

        {adminTab === "permissions" ? (
          <>
            <PermissionsPanel
              activeRoleId={permissionEditorRoleId}
              onChangeRole={setPermissionEditorRoleId}
              onCreateRole={onCreateRole}
              onDeleteRole={onDeleteRole}
              onUpdateRole={onUpdateRole}
              onUpdateRolePermission={onUpdateRolePermission}
              permissions={permissions}
            />
            <TeamPanel
              canCreate={canCreateAdminUsers}
              canUpdate={canUpdateAdminUsers}
              currentUserId={currentAdmin?.user.id ?? -1}
              onCreateUser={onCreateAdminUser}
              onResetUserPassword={onResetAdminUserPassword}
              onSetUserActive={onSetAdminUserActive}
              onUpdateUserProfile={onUpdateAdminUserProfile}
              roles={permissions?.roles ?? []}
              users={adminUsers}
            />
          </>
        ) : null}

        {adminTab === "team-log" ? <section className="dashboard-panel activity-feed" aria-labelledby="team-log-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3 id="team-log-title">Team log</h3>
            </div>
            <span className="status-pill">
              {activityFeed.length} {activityFeed.length === 1 ? "event" : "events"}
            </span>
          </div>
          <div className="activity-list">
            {activityFeed.length > 0 ? (
              activityFeed.map((item, index) => (
                <div key={`${item.happened_at}-${item.detail}-${index}`}>
                  <strong>{item.happened_at}</strong>
                  <span>{item.detail}</span>
                </div>
              ))
            ) : (
              <p>No team activity has been recorded yet.</p>
            )}
          </div>
          {hasMoreActivity ? (
            <button
              type="button"
              className="outline-button"
              disabled={isLoadingMoreActivity}
              onClick={onLoadMoreActivity}
            >
              {isLoadingMoreActivity ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </section> : null}
      </section>

      <RecordModal
        eyebrow="Account security"
        isOpen={isChangePasswordOpen}
        onClose={() => {
          onCloseChangePassword();
        }}
        title="Change Password"
      >
        <RecordForm
          fields={changePasswordFields}
          isSubmitting={isSavingChangePassword}
          onCancel={() => {
            onCloseChangePassword();
          }}
          onChange={setChangePasswordForm}
          onSubmit={() => void handleChangeOwnPassword()}
          submitLabel="Change Password"
          values={changePasswordForm}
        />
      </RecordModal>
    </main>
  );
}
