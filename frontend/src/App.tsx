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
  fetchAdminCatalog,
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAuditEvents,
  fetchCustomerPortalProfiles,
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
import { TeamPanel } from "./modules/admin_users/components/TeamPanel";
import { AdminLoginScreen } from "./modules/auth/components/AdminLoginScreen";
import { CatalogPanel } from "./modules/catalog/components/CatalogPanel";
import { InvoicesPanel } from "./modules/invoices/components/InvoicesPanel";
import { OrderControlPanel } from "./modules/orders/components/OrderControlPanel";
import { PaymentManagementPanel } from "./modules/payments/components/PaymentManagementPanel";
import { PermissionsPanel } from "./modules/permissions/components/PermissionsPanel";
import { SalesPanel } from "./modules/sales/components/SalesPanel";
import { SettingsPanel } from "./modules/settings/components/SettingsPanel";
import { fallbackPermissions } from "./data/fallback";
import {
  ApiError,
  getAuthToken,
  getCustomerAuthToken,
  setAuthToken,
  setCustomerAuthToken,
  setOnApiUnavailable,
  setOnUnauthorized
} from "./shared/api/http";
import { ManagementTable } from "./shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "./shared/components/RecordModal";
import { currencyFromCents, formatOrderDate, formatRelativeTime } from "./shared/formatters";
import type {
  ActivityItem,
  AdminAuthPayload,
  AdminCatalogPayload,
  AdminDashboardPayload,
  AdminLoginInput,
  AdminMePayload,
  AdminMetric,
  AdminResetPasswordInput,
  AdminUser,
  AuditEvent,
  CampaignOption,
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
  FulfillmentMethod,
  FulfillmentStatus,
  Invoice,
  LiveDashboardMetrics,
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

type View = "store" | "admin";
type AdminAuthState = "checking" | "unauthenticated" | "authenticated" | "demo";
type AdminTab =
  | "overview"
  | "inventory"
  | "fulfillment"
  | "campaigns"
  | "catalog"
  | "customers"
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
  { tab: "inventory", label: "Inventory", pageSlug: "admin-inventory" },
  { tab: "fulfillment", label: "Fulfillment", pageSlug: "admin-fulfillment" },
  { tab: "campaigns", label: "Campaigns", pageSlug: "admin-campaigns" },
  { tab: "catalog", label: "Catalog", pageSlug: "admin-catalog" },
  { tab: "customers", label: "Customers", pageSlug: "admin-customers" },
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

const departmentMenu = [
  "Shop All",
  "Specials & Offers",
  "Appliances",
  "Bath",
  "Building Materials",
  "Lumber",
  "Garden Center",
  "Tools",
  "Paint",
  "Storage",
  "Services",
  "DIY",
  "Pro"
];

const seasonalTags = [
  "Spring Black Friday",
  "Fast Free Delivery",
  "Special Buy of the Day",
  "Outdoor Power",
  "Patio Furniture",
  "Mulch",
  "Bathroom Vanities",
  "Refrigerators"
];

const quickServiceCalls = [
  { time: "Pickup", detail: "Buy online and collect in as little as 2 hours." },
  { time: "Delivery", detail: "Appliances, pallets and oversized orders scheduled fast." },
  { time: "Install", detail: "Measure, quote and book trusted installers from one flow." }
];

const storeClusterBars = [
  { label: "Northeast", width: "82%" },
  { label: "South", width: "91%" },
  { label: "Midwest", width: "76%" },
  { label: "West", width: "88%" }
];

const highValueAccounts = [
  { name: "Falcon Builders", detail: "$28.4k in deck and siding orders this week" },
  { name: "Northline Renovation", detail: "Kitchen appliance quote waiting on approval" },
  { name: "Summit Install Group", detail: "Bath vanity install calendar nearly full" }
];

// Derives the Overview KPI cards from live aggregates. Only cards backed by a
// real number are emitted — low-stock stays out until inventory (§3) exists.
function buildLiveMetricCards(live: LiveDashboardMetrics): AdminMetric[] {
  const revenueDelta =
    live.revenue_yesterday_cents > 0
      ? ((live.revenue_today_cents - live.revenue_yesterday_cents) /
          live.revenue_yesterday_cents) *
        100
      : null;

  return [
    {
      label: "Revenue today",
      value: currencyFromCents(live.revenue_today_cents),
      detail:
        revenueDelta === null
          ? "No sales recorded yesterday"
          : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}% vs yesterday`
    },
    {
      label: "Orders awaiting fulfillment",
      value: live.orders_awaiting_fulfillment.toLocaleString(),
      detail: "In the pick, pack and ship pipeline"
    },
    {
      label: "Unpaid invoices",
      value: live.unpaid_invoice_count.toLocaleString(),
      detail: `${currencyFromCents(live.unpaid_invoice_amount_cents)} outstanding`
    }
  ];
}

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
  onCreateCustomerPortalProfile: (
    input: CreateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
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
  onCreateCustomerPortalProfile,
  onDeleteCustomerPortalProfile,
  onUpdateCustomerPortalProfile,
  orders,
  profiles
}: CustomerPortalPanelProps) {
  const [createForm, setCreateForm] = useState<CustomerPortalFormState>(emptyCustomerPortalForm);
  const [editForm, setEditForm] = useState<CustomerPortalFormState | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
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
      setFeedback({ kind: "error", message: "The active role cannot create customer profiles." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const profile = await onCreateCustomerPortalProfile(customerPortalInputFromForm(createForm));

      setCreateForm(emptyCustomerPortalForm);
      setIsCreateOpen(false);
      setFeedback({ kind: "success", message: `${profile.customer_name} was added.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create customer profile."
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (profile: CustomerPortalProfile) => {
    setEditingProfileId(profile.id);
    setEditForm(customerPortalFormFromProfile(profile));
    setFeedback(null);
  };

  const handleUpdate = async () => {
    if (!editForm || editingProfileId === null) {
      return;
    }

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot update customer profiles." });
      return;
    }

    setSavingProfileId(editingProfileId);
    setFeedback(null);

    try {
      const profile = await onUpdateCustomerPortalProfile(
        editingProfileId,
        customerPortalInputFromForm(editForm)
      );

      setEditingProfileId(null);
      setEditForm(null);
      setFeedback({ kind: "success", message: `${profile.customer_name} was updated.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update customer profile."
      });
    } finally {
      setSavingProfileId(null);
    }
  };

  const handleDelete = async (profile: CustomerPortalProfile) => {
    if (!canDelete) {
      setFeedback({ kind: "error", message: "The active role cannot delete customer profiles." });
      return;
    }

    if (!window.confirm(`Delete ${profile.customer_name}'s customer portal profile?`)) {
      return;
    }

    setDeletingProfileId(profile.id);
    setFeedback(null);

    try {
      await onDeleteCustomerPortalProfile(profile.id);
      setFeedback({ kind: "success", message: `${profile.customer_name} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete customer profile."
      });
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
    setFeedback(null);
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

      {feedback && !isCreateOpen && !isEditOpen ? (
        <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p>
      ) : null}

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
                setFeedback(null);
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
          initialSortKey="name"
          rows={profiles}
          tableLabel="Customer profile management table"
        />
      </article>

      <RecordModal
        eyebrow="New customer"
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFeedback(null);
        }}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Create portal profile"
      >
        <RecordForm
          disabled={!canCreate}
          feedback={feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}
          fields={customerPortalFields}
          isSubmitting={isCreating}
          onCancel={() => {
            setIsCreateOpen(false);
            setFeedback(null);
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
            feedback={feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}
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

const fulfillmentBoardStages: FulfillmentStatus[] = [
  "received",
  "picking",
  "packed",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "delivered",
  "canceled"
];

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

function groupedFulfillment(orders: Order[]): Record<FulfillmentStatus, Order[]> {
  const groups = fulfillmentBoardStages.reduce(
    (accumulator, stage) => ({ ...accumulator, [stage]: [] }),
    {} as Record<FulfillmentStatus, Order[]>
  );

  for (const order of orders) {
    groups[order.fulfillment_status]?.push(order);
  }

  return groups;
}

function numericText(value: string): number {
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priceInputToCents(value: string): number | null {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function DepotMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`depot-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <span>THE</span>
      <span>HOME</span>
      <span>DEPOT</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>(window.location.pathname === "/admin" ? "admin" : "store");
  const [storefront, setStorefront] = useState<StorefrontPayload | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOption | null>(null);
  const [discount, setDiscount] = useState(25);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [oldestAuditEventId, setOldestAuditEventId] = useState<number | null>(null);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryPayload | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerPortalProfile[]>([]);
  const [customerAccountEmail, setCustomerAccountEmail] = useState(readStoredAccountEmail);
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

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    void fetchStorefront().then(setStorefront);
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
      setView(window.location.pathname === "/admin" ? "admin" : "store");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = storefront?.products ?? [];

  const fulfillmentByStage = groupedFulfillment(orders);

  const openView = (nextView: View) => {
    startTransition(() => {
      const nextPath = nextView === "admin" ? "/admin" : "/";
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
    salesData,
    salesSummaryData,
    systemSettingsData,
    customerProfileData
  }: {
    adminUsersData: AdminUser[];
    auditEventsData: AuditEvent[];
    catalogData: AdminCatalogPayload;
    dashboardData: AdminDashboardPayload;
    invoicesData: Invoice[];
    ordersData: Order[];
    paymentsData: Payment[];
    permissionsData: PermissionsPayload;
    salesData: SalesRecord[];
    salesSummaryData: SalesSummaryPayload;
    systemSettingsData: SystemSetting[];
    customerProfileData: CustomerPortalProfile[];
  }) => {
    setAdminUsers(adminUsersData);
    setAdminCatalog(catalogData);
    setDashboard(dashboardData);
    setSelectedCampaign(dashboardData.campaigns[0] ?? null);
    setActivityFeed(auditEventsData.map(auditEventToActivityItem));
    setOldestAuditEventId(
      auditEventsData.length > 0
        ? auditEventsData[auditEventsData.length - 1].id
        : null
    );
    setHasMoreActivity(auditEventsData.length >= AUDIT_EVENTS_PAGE_SIZE);
    setOrders(ordersData);
    setPayments(paymentsData);
    setSales(salesData);
    setSalesSummary(salesSummaryData);
    setInvoices(invoicesData);
    setSystemSettings(systemSettingsData);
    setCustomerProfiles(customerProfileData);
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
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      permissionsData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      canReadPermissionMatrix ? fetchPermissions() : Promise.resolve(ownPermissions)
    ]);

    applyAdminData({
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
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
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles()
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
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      permissionsData: fallbackPermissions
    });
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
    setOnApiUnavailable(() => null);

    return () => {
      setOnUnauthorized(null);
      setOnApiUnavailable(null);
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

  const clearCart = () => setCart([]);

  const lookupCustomer = async (email: string): Promise<CustomerLookupPayload> => {
    const normalizedEmail = email.trim().toLowerCase();
    const payload = await lookupCustomerRequest(normalizedEmail);

    if (payload.profile !== null || payload.orders.length > 0) {
      setCustomerAccountEmail(normalizedEmail);
      rememberAccountEmail(normalizedEmail);
    }

    return payload;
  };

  const submitCheckout = async (input: CreateOrderInput): Promise<Order> => {
    const order = await checkoutRequest(input);
    const checkoutEmail = order.customer_email.trim().toLowerCase();

    setCustomerAccountEmail(checkoutEmail);
    rememberAccountEmail(checkoutEmail);
    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then(setCustomerProfiles);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} placed for ${currencyFromCents(order.subtotal_cents)}.`
      },
      ...current
    ]);

    return order;
  };

  const createAdminOrder = async (input: CreateOrderInput): Promise<Order> => {
    const order = await createAdminOrderRequest(input);

    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then(setCustomerProfiles);
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
      void fetchSales().then(setSales);
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

  const applyCampaign = () => {
    if (!selectedCampaign) {
      return;
    }
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

  if (!storefront) {
    return <main className="loading-shell">Loading Home Depot storefront...</main>;
  }

  return (
    <div className="app-shell">
      {view === "store" ? (
        <StorefrontView
          cart={cart}
          cartCount={cartCount}
          customerAccountEmail={customerAccountEmail}
          filteredProducts={filteredProducts}
          isCartOpen={isCartOpen}
          isAccountOpen={isAccountOpen}
          maxPriceCents={maxPriceCents}
          minPriceCents={minPriceCents}
          onAddToCart={addToCart}
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
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          sortOption={sortOption}
          storefront={storefront}
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
          discount={discount}
          fulfillmentByStage={fulfillmentByStage}
          hasMoreActivity={hasMoreActivity}
          highValueAccounts={highValueAccounts}
          isChangePasswordOpen={isChangePasswordOpen}
          isLoadingMoreActivity={isLoadingMoreActivity}
          onApplyCampaign={applyCampaign}
          onLoadMoreActivity={() => void loadMoreActivity()}
          onBackToStore={() => openView("store")}
          onChangeDiscount={setDiscount}
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
          onCreateRole={createRole}
          onDeleteAdminOrder={deleteAdminOrder}
          onDeleteCategory={deleteCategory}
          onDeleteCustomerPortalProfile={deleteCustomerPortalProfile}
          onDeletePayment={deletePayment}
          onDeleteProduct={deleteProduct}
          onDeleteRole={deleteRole}
          onLogout={() => void handleAdminLogout()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onRecordInvoicePayment={recordInvoicePayment}
          onResetAdminUserPassword={resetAdminUserPassword}
          onRunSync={runSupplierSync}
          onSelectCampaign={(name) =>
            setSelectedCampaign(dashboard.campaigns.find((item) => item.name === name) ?? null)
          }
          onSetAdminUserActive={setAdminUserActive}
          onUpdateAdminOrder={updateAdminOrder}
          onUpdateAdminUserProfile={updateAdminUserProfile}
          onUpdateCategory={updateCategory}
          onUpdateOrderFulfillment={updateOrderFulfillment}
          onUpdateInvoiceBilling={updateInvoiceBilling}
          onUpdatePayment={updatePayment}
          onUpdateProduct={updateProduct}
          onUpdateRole={updateRole}
          onUpdateRolePermission={updateRolePermission}
          onUpdateSalesDetails={updateSalesDetails}
          onUpdateSalesStatus={updateSalesStatus}
          onUpdateSystemSetting={updateSystemSetting}
          onVoidInvoice={voidInvoice}
          orders={orders}
          payments={payments}
          invoices={invoices}
          sales={sales}
          salesSummary={salesSummary}
          systemSettings={systemSettings}
          permissions={permissions}
          products={adminCatalog.products}
          selectedCampaign={selectedCampaign}
          storeClusterBars={storeClusterBars}
          onUpdateCustomerPortalProfile={updateCustomerPortalProfile}
        />
      )}
    </div>
  );
}

type StorefrontViewProps = {
  cart: CartItem[];
  cartCount: number;
  customerAccountEmail: string;
  filteredProducts: Product[];
  isAccountOpen: boolean;
  isCartOpen: boolean;
  maxPriceCents: number | null;
  minPriceCents: number | null;
  onAddToCart: (product: Product) => void;
  onChangeCategory: (slug: string) => void;
  onChangeMaxPrice: (value: number | null) => void;
  onChangeMinPrice: (value: number | null) => void;
  onChangeSearch: (value: string) => void;
  onChangeSort: (value: StorefrontSort) => void;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onCloseAccount: () => void;
  onClearCart: () => void;
  onCloseCart: () => void;
  onLookupCustomer: (email: string) => Promise<CustomerLookupPayload>;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  searchTerm: string;
  selectedCategory: string;
  sortOption: StorefrontSort;
  storefront: StorefrontPayload;
};

function StorefrontView({
  cart,
  cartCount,
  customerAccountEmail,
  filteredProducts,
  isAccountOpen,
  isCartOpen,
  maxPriceCents,
  minPriceCents,
  onAddToCart,
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
  onRemoveFromCart,
  onUpdateQuantity,
  searchTerm,
  selectedCategory,
  sortOption,
  storefront
}: StorefrontViewProps) {
  const activeCategory =
    storefront.categories.find((category) => category.slug === selectedCategory) ?? storefront.categories[0];

  return (
    <>
      <div className="top-strip">
        <p>Spring Black Friday is live with daily savings, fast delivery and pickup-ready inventory.</p>
        <button className="top-link" onClick={onOpenAdmin}>
          Open Ops Console
        </button>
      </div>

      <header className="site-header">
        <div className="brand-block">
          <DepotMark />
          <div className="brand-copy">
            <p className="eyebrow">#1 Home Improvement Retailer</p>
            <h1>The Home Depot</h1>
            <p className="brand-tagline">How doers get more done.</p>
          </div>
        </div>

        <div className="header-actions">
          <label className="search-shell">
            <span>What can we help you find today?</span>
            <input
              type="search"
              placeholder="Search tools, appliances, patio, paint and more"
              value={searchTerm}
              onChange={(event) => onChangeSearch(event.target.value)}
            />
          </label>
          <button className="outline-button" onClick={onOpenAccount}>
            My Account
          </button>
          <button className="solid-button cart-button" onClick={onOpenCart}>
            Cart
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="mega-nav" aria-label="Primary">
        {departmentMenu.map((item) => (
          <a href="#categories" key={item}>
            {item}
          </a>
        ))}
        <button className="nav-button" onClick={onOpenAdmin}>
          Admin
        </button>
      </nav>

      <main className="page-shell">
        <section className="hero-grid">
          <article className="hero-panel hero-primary">
            <div className="hero-copy">
              <p className="eyebrow">Spring Black Friday</p>
              <h2>Big orange savings across tools, patio, appliances and pickup-ready essentials.</h2>
              <p>
                This storefront is rebuilt to feel like the real Home Depot homepage: utility-first
                navigation, dense promotional blocks and a strong mix of DIY, pro and service-driven
                merchandising.
              </p>
              <div className="hero-actions">
                <a className="solid-button" href="#featured-products">
                  Shop Deals
                </a>
                <a className="outline-button" href="#services">
                  Explore Services
                </a>
              </div>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>2 hrs</strong>
                <span>pickup-ready order window</span>
              </div>
              <div>
                <strong>48 states</strong>
                <span>delivery coverage on major appliances</span>
              </div>
              <div>
                <strong>1,300+</strong>
                <span>rental and service touchpoints</span>
              </div>
            </div>
          </article>

          <article className="hero-panel hero-secondary">
            <p className="eyebrow">Today&apos;s Big Savings</p>
            <h3>Deals stacked the way shoppers expect.</h3>
            <p>Browse category-led offers built for spring projects, quick refreshes and pro replenishment.</p>
            <ul className="deal-points">
              <li>Special Buy pricing on cordless tool kits</li>
              <li>Fast free delivery on select appliances</li>
              <li>Patio and garden markdowns ahead of the weekend</li>
            </ul>
            <a className="text-link" href="#deals">
              View all savings
            </a>
          </article>

          <article className="hero-panel hero-tertiary">
            <p className="eyebrow">Store Services</p>
            <h3>Pickup, delivery and installs from one shelf.</h3>
            <p>Bring the retail convenience layer closer to the product grid instead of hiding it in a side flow.</p>
            <div className="mini-board">
              {quickServiceCalls.map((item) => (
                <div key={item.time}>
                  <span>{item.time}</span>
                  <strong>{item.detail}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="promo-rail" id="deals">
          {storefront.promotions.map((promotion) => (
            <article key={promotion.title}>
              <p className="eyebrow">{promotion.label}</p>
              <h3>{promotion.title}</h3>
              <p>{promotion.description}</p>
            </article>
          ))}
        </section>

        <section className="seasonal-band" aria-label="Seasonal highlights">
          {seasonalTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading">
            <p className="eyebrow">Shop By Category</p>
            <h2>Department-first merchandising, just like the live site</h2>
            <p className="section-copy">Now showing: {activeCategory?.name ?? "All Departments"}</p>
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
              <span>Min price</span>
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
              <span>Max price</span>
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
              <span>Sort by</span>
              <select
                value={sortOption}
                onChange={(event) => onChangeSort(event.target.value as StorefrontSort)}
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </label>
          </div>
        </section>

        <section className="savings-band">
          <div>
            <p className="eyebrow">Savings Snapshot</p>
            <h3>Promotions grouped around urgency, delivery and category breadth.</h3>
            <p>{filteredProducts.length} featured products match the current department and search filters.</p>
          </div>
          <div className="savings-tags">
            <span>Daily Deals</span>
            <span>Special Buy</span>
            <span>Free Delivery</span>
            <span>Pro Volume Pricing</span>
          </div>
        </section>

        <section className="product-section" id="featured-products">
          <div className="section-heading">
            <p className="eyebrow">Spring Black Friday Deals</p>
            <h2>Featured products with Home Depot-style density and hierarchy</h2>
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
                       <p className="price-label">From</p>
                       <strong>{currencyFromCents(product.price_cents)}</strong>
                       <p>{categoryName}</p>
                     </div>
                     <button onClick={() => onAddToCart(product)}>Add to Cart</button>
                   </footer>
                 </article>
               );
             })}
           </div>
        </section>

        <section className="services-section" id="services">
          <div className="section-heading">
            <p className="eyebrow">More Ways To Get It Done</p>
            <h2>Services belong next to the commerce, not outside it</h2>
          </div>

          <div className="service-grid">
            {storefront.services.map((service) => (
              <article className="service-card" key={service.name}>
                <p className="eyebrow">Service</p>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pro-section" id="pro-desk">
          <div className="pro-copy">
            <p className="eyebrow">Pro Services & Contractor Supply</p>
            <h2>Built for crews that need quotes, pickups and installs to move without friction.</h2>
            <p>
              The clone keeps the consumer storefront recognizable while still surfacing the operational
              muscle behind pickup windows, trade pricing and regional inventory flow.
            </p>
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
        open={isCartOpen}
        onCheckout={onCheckout}
        onClose={onCloseCart}
        onCompleted={onClearCart}
        onRemoveFromCart={onRemoveFromCart}
        onUpdateQuantity={onUpdateQuantity}
      />
      <AccountDrawer
        open={isAccountOpen}
        customerAccountEmail={customerAccountEmail}
        onLookupCustomer={onLookupCustomer}
        onClose={onCloseAccount}
      />
    </>
  );
}

type AccountDrawerProps = {
  open: boolean;
  customerAccountEmail: string;
  onLookupCustomer: (email: string) => Promise<CustomerLookupPayload>;
  onClose: () => void;
};

type AccountLookupStatus = "idle" | "loading" | "success" | "error";
type AccountAuthView = "login" | "register" | "guest";

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
  onLookupCustomer,
  onClose
}: AccountDrawerProps) {
  const [lookupEmail, setLookupEmail] = useState(customerAccountEmail);
  const [lookupPayload, setLookupPayload] = useState<CustomerLookupPayload>(
    emptyCustomerLookupPayload
  );
  const [lookupStatus, setLookupStatus] = useState<AccountLookupStatus>("idle");
  const [lookupError, setLookupError] = useState("");
  const lastAutoLookupEmailRef = useRef<string | null>(null);

  const [session, setSession] = useState<CustomerMePayload | null>(null);
  const [authView, setAuthView] = useState<AccountAuthView>("login");
  const [authForm, setAuthForm] = useState<CustomerRegisterInput>(emptyCustomerAuthForm);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [authError, setAuthError] = useState("");

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
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
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
      setAuthError(error instanceof Error ? error.message : "Unable to register.");
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
    }
  };

  const runLookup = async (email: string) => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLookupPayload(emptyCustomerLookupPayload);
      setLookupStatus("idle");
      setLookupError("");
      return;
    }

    setLookupStatus("loading");
    setLookupError("");

    try {
      const payload = await onLookupCustomer(trimmedEmail);
      setLookupPayload(payload);
      setLookupStatus("success");
    } catch (error) {
      setLookupStatus("error");
      setLookupError(error instanceof Error ? error.message : "Unable to look up orders.");
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const storedEmail = customerAccountEmail.trim().toLowerCase();

    // Skip when this is the email a manual submit (or a prior run of this
    // effect) already fetched, so a successful lookupCustomer call that
    // updates customerAccountEmail doesn't trigger a second request.
    if (storedEmail === (lastAutoLookupEmailRef.current ?? "")) {
      return;
    }

    lastAutoLookupEmailRef.current = storedEmail;
    setLookupEmail(storedEmail);

    if (storedEmail) {
      void runLookup(storedEmail);
      return;
    }

    setLookupPayload(emptyCustomerLookupPayload);
    setLookupStatus("idle");
    setLookupError("");
  }, [open, customerAccountEmail]);

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
    lastAutoLookupEmailRef.current = lookupEmail.trim().toLowerCase();
    void runLookup(lookupEmail);
  };

  const close = () => {
    onClose();
  };

  if (session) {
    const sessionProfile = session.profile;
    const sessionOrders = [...session.orders].sort(
      (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)
    );
    const sessionLifetimeCents =
      sessionProfile?.lifetime_purchase_cents ??
      sessionOrders.reduce((sum, order) => sum + order.subtotal_cents, 0);
    const sessionTotalOrders = sessionProfile?.total_orders ?? sessionOrders.length;

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
              <p className="eyebrow">{sessionProfile?.membership_tier ?? "Online Shopper"}</p>
              <h3>{sessionProfile?.customer_name ?? session.account.display_name}</h3>
              <p>{session.account.email}</p>
            </section>

            <section className="account-stat-grid" aria-label="Account summary">
              <div>
                <span>Points</span>
                <strong>{(sessionProfile?.points_balance ?? 0).toLocaleString()}</strong>
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
                  {sessionProfile?.last_purchase_at
                    ? formatOrderDate(sessionProfile.last_purchase_at)
                    : sessionOrders[0]
                      ? formatOrderDate(sessionOrders[0].created_at)
                      : "None yet"}
                </strong>
              </div>
            </section>

            <section className="account-section">
              <div className="account-section-head">
                <p className="eyebrow">Recent Orders</p>
                <span className="status-pill">{sessionOrders.length} found</span>
              </div>
              {sessionOrders.length > 0 ? (
                <div className="account-orders">
                  {sessionOrders.map((order) => (
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
                <p className="account-empty-note">No storefront orders are attached to this account yet.</p>
              )}
            </section>

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
  open: boolean;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onClose: () => void;
  onCompleted: () => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
};

function CartDrawer({
  cart,
  open,
  onCheckout,
  onClose,
  onCompleted,
  onRemoveFromCart,
  onUpdateQuantity
}: CartDrawerProps) {
  const [stage, setStage] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<{
    customer_name: string;
    customer_email: string;
    fulfillment_method: FulfillmentMethod;
  }>({ customer_name: "", customer_email: "", fulfillment_method: "pickup" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) {
    return null;
  }

  const subtotalCents = cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);

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
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity }))
      });
      setConfirmedOrder(order);
      onCompleted();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Checkout failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  let title = "Your Cart";
  if (confirmedOrder) {
    title = "Order Confirmed";
  } else if (stage === "checkout") {
    title = "Checkout";
  }

  return (
    <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="cart-scrim" aria-label="Close cart" onClick={close} />
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
            <p className="cart-confirm-total">{currencyFromCents(confirmedOrder.subtotal_cents)} total</p>
            <p>{fulfillmentLabel(confirmedOrder.fulfillment_method)} order</p>
            <button className="solid-button" onClick={close}>
              Continue Shopping
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
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
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="cart-drawer-foot">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <strong>{currencyFromCents(subtotalCents)}</strong>
              </div>
              <button className="solid-button" onClick={() => setStage("checkout")}>
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
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <strong>{currencyFromCents(subtotalCents)}</strong>
            </div>
            <div className="cart-checkout-actions">
              <button type="button" className="outline-button" onClick={() => setStage("cart")}>
                Back to cart
              </button>
              <button type="submit" className="solid-button" disabled={isSubmitting}>
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
  discount: number;
  fulfillmentByStage: Record<FulfillmentStatus, Order[]>;
  hasMoreActivity: boolean;
  highValueAccounts: { name: string; detail: string }[];
  isChangePasswordOpen: boolean;
  isLoadingMoreActivity: boolean;
  onApplyCampaign: () => void;
  onBackToStore: () => void;
  onChangeDiscount: (value: number) => void;
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
  onCreateRole: (input: CreateRoleInput) => Promise<Role>;
  onDeleteAdminOrder: (orderId: number) => Promise<void>;
  onDeleteCategory: (slug: string) => Promise<void>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  onRecordInvoicePayment: (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ) => Promise<Invoice>;
  onResetAdminUserPassword: (userId: number, input: AdminResetPasswordInput) => Promise<void>;
  onRunSync: () => void;
  onSelectCampaign: (name: string) => void;
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
  onUpdateOrderFulfillment: (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ) => Promise<Order>;
  onUpdateRole: (roleId: number, input: UpdateRoleInput) => Promise<Role>;
  onUpdateRolePermission: (input: UpdateRolePagePermissionInput) => Promise<RolePagePermission>;
  onUpdateSalesDetails: (orderId: number, input: UpdateSalesDetailsInput) => Promise<SalesRecord>;
  onUpdateSalesStatus: (orderId: number, input: UpdateSalesStatusInput) => Promise<SalesRecord>;
  onUpdateSystemSetting: (key: string, input: UpdateSystemSettingInput) => Promise<SystemSetting>;
  onVoidInvoice: (invoiceId: number) => Promise<Invoice>;
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
  sales: SalesRecord[];
  salesSummary: SalesSummaryPayload | null;
  systemSettings: SystemSetting[];
  permissions: PermissionsPayload | null;
  products: Product[];
  selectedCampaign: CampaignOption | null;
  storeClusterBars: { label: string; width: string }[];
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
  discount,
  fulfillmentByStage,
  hasMoreActivity,
  highValueAccounts,
  isChangePasswordOpen,
  isLoadingMoreActivity,
  onApplyCampaign,
  onBackToStore,
  onChangeDiscount,
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
  onCreateRole,
  onDeleteAdminOrder,
  onDeleteCategory,
  onDeleteCustomerPortalProfile,
  onDeletePayment,
  onDeleteProduct,
  onDeleteRole,
  onLogout,
  onOpenChangePassword,
  onRecordInvoicePayment,
  onResetAdminUserPassword,
  onRunSync,
  onSelectCampaign,
  onSetAdminUserActive,
  onUpdateAdminOrder,
  onUpdateAdminUserProfile,
  onUpdateCategory,
  onUpdateCustomerPortalProfile,
  onUpdateInvoiceBilling,
  onUpdatePayment,
  onUpdateProduct,
  onUpdateOrderFulfillment,
  onUpdateRole,
  onUpdateRolePermission,
  onUpdateSalesDetails,
  onUpdateSalesStatus,
  onUpdateSystemSetting,
  onVoidInvoice,
  orders,
  payments,
  invoices,
  sales,
  salesSummary,
  systemSettings,
  permissions,
  products,
  selectedCampaign,
  storeClusterBars
}: AdminViewProps) {
  const [permissionEditorRoleId, setPermissionEditorRoleId] = useState<number | null>(activeRoleId);
  const [changePasswordForm, setChangePasswordForm] = useState<ChangeOwnPasswordInput>({
    current_password: "",
    new_password: ""
  });
  const [changePasswordFeedback, setChangePasswordFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isSavingChangePassword, setIsSavingChangePassword] = useState(false);
  const activeRole = currentAdmin?.role ?? permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canCreateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "create");
  const canUpdateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "update");
  const canDeleteCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "delete");
  const canCreateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "create");
  const canUpdateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "update");
  const canDeleteCustomers = canAccess(permissions, activeRoleId, "admin-customers", "delete");
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
  const canUpdateCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "update");
  const canRunOperationsSync = canAccess(permissions, activeRoleId, "admin-overview", "update");
  const canCreateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "create");
  const canUpdateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "update");

  const handleChangeOwnPassword = async () => {
    setIsSavingChangePassword(true);
    setChangePasswordFeedback(null);

    try {
      await onChangeOwnPassword(changePasswordForm);
      setChangePasswordForm({ current_password: "", new_password: "" });
      onCloseChangePassword();
    } catch (error) {
      setChangePasswordFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to change password."
      });
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

  const inventoryColumns = [
    {
      key: "department",
      label: "Department",
      sortValue: (item: AdminDashboardPayload["inventory"][number]) => item.department,
      render: (item: AdminDashboardPayload["inventory"][number]) => (
        <strong>{item.department}</strong>
      )
    },
    {
      key: "on_hand",
      label: "On hand",
      align: "right" as const,
      sortValue: (item: AdminDashboardPayload["inventory"][number]) => numericText(item.on_hand),
      render: (item: AdminDashboardPayload["inventory"][number]) => item.on_hand
    },
    {
      key: "lead_region",
      label: "Lead region",
      sortValue: (item: AdminDashboardPayload["inventory"][number]) => item.lead_region,
      render: (item: AdminDashboardPayload["inventory"][number]) => item.lead_region
    },
    {
      key: "status",
      label: "Status",
      sortValue: (item: AdminDashboardPayload["inventory"][number]) => item.status,
      render: (item: AdminDashboardPayload["inventory"][number]) => (
        <span
          className={`status-pill ${
            item.status === "Healthy" ? "live" : item.status === "Low" ? "warning" : ""
          }`}
        >
          {item.status}
        </span>
      )
    },
    {
      key: "note",
      label: "Notes",
      sortValue: (item: AdminDashboardPayload["inventory"][number]) => item.note,
      render: (item: AdminDashboardPayload["inventory"][number]) => item.note
    }
  ];
  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <DepotMark compact />
          <div>
            <p className="eyebrow">Internal Retail Tools</p>
            <h1>Ops Console</h1>
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
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Store Operations</p>
            <h2>Merchandising, fulfillment and promo controls</h2>
          </div>
          <div className="admin-actions">
            <button className="solid-button" disabled={!canRunOperationsSync} onClick={onRunSync}>
              Run Supplier Sync
            </button>
          </div>
        </header>

        {demoMode ? (
          <p className="admin-demo-banner">
            API unreachable. Showing fallback admin data with write controls disabled.
          </p>
        ) : null}

        {adminTab === "overview" ? (
          <section className="admin-section active">
            <div className="metric-grid">
              {buildLiveMetricCards(dashboard.live_metrics).map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <span>{metric.detail}</span>
                </article>
              ))}
            </div>

            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Regional performance</p>
                    <h3>Store cluster momentum</h3>
                  </div>
                  <span className="status-pill live">Live</span>
                </div>
                <div className="bar-chart">
                  {storeClusterBars.map((bar) => (
                    <div key={bar.label}>
                      <span>{bar.label}</span>
                      <strong style={{ width: bar.width }}>{bar.width}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Trade account radar</p>
                    <h3>High-value customers</h3>
                  </div>
                  <span className="status-pill">Tracked</span>
                </div>
                <div className="customer-list">
                  {highValueAccounts.map((account) => (
                    <div key={account.name}>
                      <strong>{account.name}</strong>
                      <span>{account.detail}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {adminTab === "inventory" ? (
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Inventory health</p>
                <h3>Replenishment watchlist</h3>
              </div>
              <span className="status-pill warning">Attention</span>
            </div>
            <ManagementTable
              columns={inventoryColumns}
              emptyMessage="No inventory records are available."
              getRowKey={(item) => item.department}
              initialSortKey="department"
              rows={dashboard.inventory}
              tableLabel="Inventory management table"
            />
          </section>
        ) : null}

        {adminTab === "fulfillment" ? (
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Fulfillment board</p>
                <h3>Order flow by stage</h3>
              </div>
              <span className="status-pill live">{orders.length} orders</span>
            </div>
            <div className="fulfillment-grid">
              {fulfillmentBoardStages.map((stage) => {
                const stageOrders = fulfillmentByStage[stage];

                return (
                <article className="fulfillment-column" key={stage}>
                  <div className="fulfillment-column-head">
                    <h4>{fulfillmentLabel(stage)}</h4>
                    <span className="status-pill">{stageOrders.length}</span>
                  </div>
                  {stageOrders.length === 0 ? (
                    <p className="table-muted">No orders</p>
                  ) : (
                    stageOrders.map((order) => (
                      <div className="task-card fulfillment-order-card" key={order.id}>
                        <strong>#{order.id} {order.customer_name}</strong>
                        <span>{fulfillmentLabel(order.fulfillment_method)}</span>
                        <span>{currencyFromCents(order.subtotal_cents)}</span>
                        <small>{formatOrderDate(order.created_at)}</small>
                      </div>
                    ))
                  )}
                </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {adminTab === "campaigns" ? (
          <section className="admin-section active">
            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Campaign composer</p>
                    <h3>Promo controls</h3>
                  </div>
                  <span className={`status-pill ${canUpdateCampaigns ? "live" : ""}`}>
                    {canUpdateCampaigns ? "Editable" : "Read only"}
                  </span>
                </div>
                <div className="campaign-controls">
                  <label>
                    Featured department
                    <select
                      value={selectedCampaign?.name ?? ""}
                      onChange={(event) => onSelectCampaign(event.target.value)}
                    >
                      {dashboard.campaigns.map((campaign) => (
                        <option key={campaign.name} value={campaign.name}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Offer intensity
                    <input
                      max={40}
                      min={10}
                      onChange={(event) => onChangeDiscount(Number(event.target.value))}
                      type="range"
                      value={discount}
                    />
                  </label>
                  <button
                    className="solid-button"
                    disabled={!canUpdateCampaigns}
                    onClick={onApplyCampaign}
                  >
                    Apply Campaign Update
                  </button>
                </div>
              </article>

              <article className="dashboard-panel campaign-preview">
                <p className="eyebrow">Live preview</p>
                <h3>{selectedCampaign?.name ?? "Campaign"}</h3>
                <strong>{discount}% off</strong>
                <p>{selectedCampaign?.description ?? "Select a campaign to update the preview."}</p>
              </article>
            </div>
          </section>
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
            onCreateCustomerPortalProfile={onCreateCustomerPortalProfile}
            onDeleteCustomerPortalProfile={onDeleteCustomerPortalProfile}
            onUpdateCustomerPortalProfile={onUpdateCustomerPortalProfile}
            orders={orders}
            profiles={customerProfiles}
          />
        ) : null}

        {adminTab === "orders" ? (
          <OrderControlPanel
            canCreate={canCreateOrders}
            canDelete={canDeleteOrders}
            canUpdate={canUpdateOrders}
            onCreateOrder={onCreateAdminOrder}
            onDeleteOrder={onDeleteAdminOrder}
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
            invoices={invoices}
            onCreateInvoiceFromOrder={onCreateInvoiceFromOrder}
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

        <section className="dashboard-panel activity-feed">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3>Team log</h3>
            </div>
            <span className="status-pill">Updated</span>
          </div>
          <div className="activity-list">
            {activityFeed.map((item, index) => (
              <div key={`${item.happened_at}-${item.detail}-${index}`}>
                <strong>{item.happened_at}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
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
        </section>
      </section>

      <RecordModal
        eyebrow="Account security"
        isOpen={isChangePasswordOpen}
        onClose={() => {
          onCloseChangePassword();
          setChangePasswordFeedback(null);
        }}
        title="Change Password"
      >
        <RecordForm
          feedback={
            changePasswordFeedback ? (
              <p className={`catalog-feedback ${changePasswordFeedback.kind}`}>
                {changePasswordFeedback.message}
              </p>
            ) : null
          }
          fields={changePasswordFields}
          isSubmitting={isSavingChangePassword}
          onCancel={() => {
            onCloseChangePassword();
            setChangePasswordFeedback(null);
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
