import { type FormEvent, startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  checkout as checkoutRequest,
  createAdminOrder as createAdminOrderRequest,
  createCategory as createCategoryRequest,
  createCustomerPortalProfile as createCustomerPortalProfileRequest,
  createInvoiceFromOrder as createInvoiceFromOrderRequest,
  createPayment as createPaymentRequest,
  createProduct as createProductRequest,
  createRole as createRoleRequest,
  deleteAdminOrder as deleteAdminOrderRequest,
  deleteCustomerPortalProfile as deleteCustomerPortalProfileRequest,
  deletePayment as deletePaymentRequest,
  deleteRole as deleteRoleRequest,
  fetchAdminDashboard,
  fetchCustomerPortalProfiles,
  fetchInvoices,
  fetchOrders,
  fetchPayments,
  fetchPermissions,
  fetchSales,
  fetchSalesSummary,
  fetchStorefront,
  fetchSystemSettings,
  recordInvoicePayment as recordInvoicePaymentRequest,
  updateAdminOrder as updateAdminOrderRequest,
  updateCustomerPortalProfile as updateCustomerPortalProfileRequest,
  updateInvoiceBilling as updateInvoiceBillingRequest,
  updatePayment as updatePaymentRequest,
  updateProduct as updateProductRequest,
  updateRole as updateRoleRequest,
  updateRolePermission as updateRolePermissionRequest,
  updateSalesDetails as updateSalesDetailsRequest,
  updateSalesStatus as updateSalesStatusRequest,
  updateSystemSetting as updateSystemSettingRequest,
  voidInvoice as voidInvoiceRequest
} from "./lib/api";
import { InvoicesPanel } from "./modules/invoices/components/InvoicesPanel";
import { OrderControlPanel } from "./modules/orders/components/OrderControlPanel";
import { PaymentManagementPanel } from "./modules/payments/components/PaymentManagementPanel";
import { PermissionsPanel } from "./modules/permissions/components/PermissionsPanel";
import { SalesPanel } from "./modules/sales/components/SalesPanel";
import { SettingsPanel } from "./modules/settings/components/SettingsPanel";
import { ManagementTable } from "./shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "./shared/components/RecordModal";
import { currencyFromCents, formatOrderDate } from "./shared/formatters";
import type {
  ActivityItem,
  AdminDashboardPayload,
  CampaignOption,
  CartItem,
  Category,
  CreateCategoryInput,
  CreateCustomerPortalProfileInput,
  CreateInvoiceFromOrderInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateProductInput,
  CreateRoleInput,
  CustomerPortalProfile,
  FulfillmentItem,
  Invoice,
  Order,
  Payment,
  PermissionsPayload,
  Product,
  RecordInvoicePaymentInput,
  Role,
  RolePagePermission,
  SalesRecord,
  SalesSummaryPayload,
  StorefrontPayload,
  SystemSetting,
  UpdateCustomerPortalProfileInput,
  UpdateInvoiceBillingInput,
  UpdatePaymentInput,
  UpdateProductInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput,
  UpdateSystemSettingInput
} from "./types";

const CART_STORAGE_KEY = "depot-cart";
const ACCOUNT_EMAIL_STORAGE_KEY = "depot-account-email";

type View = "store" | "admin";
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
    return true;
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

function groupedFulfillment(items: FulfillmentItem[]): Record<string, FulfillmentItem[]> {
  return items.reduce<Record<string, FulfillmentItem[]>>((groups, item) => {
    groups[item.stage] = groups[item.stage] ? [...groups[item.stage], item] : [item];
    return groups;
  }, {});
}

function numericText(value: string): number {
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

type ProductFormState = {
  badge: string;
  category_slug: string;
  description: string;
  featured: boolean;
  name: string;
  price: string;
  tone: string;
};

const categoryFields: RecordFormField<CreateCategoryInput>[] = [
  {
    name: "name",
    label: "Category name",
    required: true,
    minLength: 2,
    placeholder: "Ceiling Fans"
  },
  {
    name: "slug",
    label: "Slug",
    helpText: "Leave blank to auto-generate it from the category name.",
    placeholder: "ceiling-fans",
    validate: (value) => {
      const slug = String(value).trim();
      return slug.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
        ? null
        : "Use lowercase letters, numbers and hyphens only.";
    }
  },
  {
    name: "teaser",
    label: "Teaser",
    type: "textarea",
    required: true,
    minLength: 12,
    placeholder: "Fans, lighting and comfort upgrades for every room.",
    rows: 4
  }
];

function emptyProductForm(categories: Category[]): ProductFormState {
  return {
    name: "",
    category_slug: categories[0]?.slug ?? "all",
    price: "",
    badge: "",
    description: "",
    tone: "",
    featured: true
  };
}

function productFormFromProduct(product: Product): ProductFormState {
  return {
    name: product.name,
    category_slug: product.category_slug,
    price: (product.price_cents / 100).toFixed(2),
    badge: product.badge,
    description: product.description,
    tone: product.tone,
    featured: product.featured
  };
}

function productInputFromForm(form: ProductFormState): CreateProductInput {
  const normalizedPrice = Math.round(Number(form.price) * 100);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
    throw new Error("Enter a valid product price.");
  }

  return {
    name: form.name.trim(),
    category_slug: form.category_slug,
    price_cents: normalizedPrice,
    badge: form.badge.trim(),
    description: form.description.trim(),
    tone: form.tone.trim(),
    featured: form.featured
  };
}

function productFields(categories: Category[]): RecordFormField<ProductFormState>[] {
  return [
    {
      name: "name",
      label: "Product name",
      required: true,
      minLength: 2,
      placeholder: "Home Decorators Ceiling Fan"
    },
    {
      name: "category_slug",
      label: "Category",
      type: "select",
      options: categories.map((category) => ({ label: category.name, value: category.slug }))
    },
    {
      name: "price",
      label: "Price",
      type: "number",
      required: true,
      min: 0,
      step: "0.01",
      placeholder: "249.00",
      validate: (value) => (Number.isFinite(Number(value)) ? null : "Enter a valid product price.")
    },
    {
      name: "badge",
      label: "Badge",
      required: true,
      placeholder: "New Arrival"
    },
    {
      name: "tone",
      label: "Brand / tone",
      required: true,
      placeholder: "Home Decorators Collection"
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      minLength: 12,
      placeholder: "Modern finish, integrated light kit and remote control for easy installs.",
      rows: 4
    },
    {
      name: "featured",
      label: "Show on storefront",
      type: "toggle",
      description: "Turn on to publish this product to shoppers immediately."
    }
  ];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOption | null>(null);
  const [discount, setDiscount] = useState(25);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
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

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    void Promise.all([
      fetchStorefront(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      fetchPermissions()
    ]).then(
      ([
        storefrontData,
        dashboardData,
        ordersData,
        paymentsData,
        salesData,
        salesSummaryData,
        invoicesData,
        systemSettingsData,
        customerProfileData,
        permissionsData
      ]) => {
        setStorefront(storefrontData);
        setDashboard(dashboardData);
        setSelectedCampaign(dashboardData.campaigns[0] ?? null);
        setActivityFeed(dashboardData.activity);
        setOrders(ordersData);
        setPayments(paymentsData);
        setSales(salesData);
        setSalesSummary(salesSummaryData);
        setInvoices(invoicesData);
        setSystemSettings(systemSettingsData);
        setCustomerProfiles(customerProfileData);
        setPermissions(permissionsData);
        setActiveRoleId(permissionsData.roles.find((role) => role.is_super_admin)?.id ?? permissionsData.roles[0]?.id ?? null);
      }
    );
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(window.location.pathname === "/admin" ? "admin" : "store");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = !storefront
    ? []
    : storefront.products.filter((product) => {
        const matchesCategory =
          selectedCategory === "all" || product.category_slug === selectedCategory;

        const search = deferredSearchTerm.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          product.name.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search) ||
          product.badge.toLowerCase().includes(search) ||
          product.tone.toLowerCase().includes(search);

        return matchesCategory && matchesSearch;
      });

  const fulfillmentByStage = groupedFulfillment(dashboard?.fulfillment ?? []);

  const openView = (nextView: View) => {
    startTransition(() => {
      const nextPath = nextView === "admin" ? "/admin" : "/";
      window.history.pushState({}, "", nextPath);
      setView(nextView);
    });
  };

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
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${product.name} added to cart from the storefront.`
      },
      ...current
    ]);
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

  const activeRoleForWrite = (): number => {
    if (activeRoleId === null) {
      throw new Error("Select an admin role before making this change.");
    }

    return activeRoleId;
  };

  const createAdminOrder = async (input: CreateOrderInput): Promise<Order> => {
    const order = await createAdminOrderRequest(input, activeRoleForWrite());

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
    const order = await updateAdminOrderRequest(orderId, input, activeRoleForWrite());

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

  const deleteAdminOrder = async (orderId: number): Promise<void> => {
    await deleteAdminOrderRequest(orderId, activeRoleForWrite());

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
    const payment = await createPaymentRequest(input, activeRoleForWrite());

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
    const payment = await updatePaymentRequest(paymentId, input, activeRoleForWrite());

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
    await deletePaymentRequest(paymentId, activeRoleForWrite());

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
    const sale = await updateSalesDetailsRequest(orderId, input, activeRoleForWrite());

    setSales((current) => current.map((item) => (item.order_id === sale.order_id ? sale : item)));
    void fetchSalesSummary().then(setSalesSummary);

    return sale;
  };

  const updateSalesStatus = async (
    orderId: number,
    input: UpdateSalesStatusInput
  ): Promise<SalesRecord> => {
    const sale = await updateSalesStatusRequest(orderId, input, activeRoleForWrite());

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
    const invoice = await createInvoiceFromOrderRequest(orderId, input, activeRoleForWrite());

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
    const invoice = await updateInvoiceBillingRequest(invoiceId, input, activeRoleForWrite());

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));

    return invoice;
  };

  const voidInvoice = async (invoiceId: number): Promise<Invoice> => {
    const invoice = await voidInvoiceRequest(invoiceId, activeRoleForWrite());

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
    const invoice = await recordInvoicePaymentRequest(invoiceId, input, activeRoleForWrite());

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
    const setting = await updateSystemSettingRequest(key, input, activeRoleForWrite());

    setSystemSettings((current) =>
      current.map((item) => (item.key === setting.key ? setting : item))
    );

    return setting;
  };

  const createRole = async (input: CreateRoleInput): Promise<Role> => {
    const role = await createRoleRequest(input, activeRoleForWrite());

    setPermissions((current) =>
      current
        ? {
            ...current,
            roles: [...current.roles, role]
          }
        : current
    );
    setActiveRoleId(role.id);
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `${role.name} role was added to the permission matrix.` },
      ...current
    ]);

    return role;
  };

  const updateRole = async (roleId: number, input: UpdateRoleInput): Promise<Role> => {
    const role = await updateRoleRequest(roleId, input, activeRoleForWrite());

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
    await deleteRoleRequest(roleId, activeRoleForWrite());

    const remainingRoles = permissions?.roles.filter((role) => role.id !== roleId) ?? [];
    const nextRoleId = remainingRoles.find((role) => role.is_super_admin)?.id ?? remainingRoles[0]?.id ?? null;

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
    setActiveRoleId((selectedRoleId) => (selectedRoleId === roleId ? nextRoleId : selectedRoleId));
  };

  const updateRolePermission = async (
    input: UpdateRolePagePermissionInput
  ): Promise<RolePagePermission> => {
    const permission = await updateRolePermissionRequest(input, activeRoleForWrite());

    setPermissions((current) => (current ? applyPermissionUpdate(current, permission) : current));

    return permission;
  };

  const applyCampaign = () => {
    if (!selectedCampaign) {
      return;
    }

    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Campaign updated: ${selectedCampaign.name} set to ${discount}% off.`
      },
      ...current
    ]);
  };

  const runSupplierSync = () => {
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: "Supplier and pricing sync completed for all monitored merchandising feeds."
      },
      ...current
    ]);
  };

  const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
    const category = await createCategoryRequest(input, activeRoleForWrite());

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

  const createProduct = async (input: CreateProductInput): Promise<Product> => {
    const product = await createProductRequest(input, activeRoleForWrite());

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
    const product = await updateProductRequest(productId, input, activeRoleForWrite());

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

  const createCustomerPortalProfile = async (
    input: CreateCustomerPortalProfileInput
  ): Promise<CustomerPortalProfile> => {
    const profile = await createCustomerPortalProfileRequest(input, activeRoleForWrite());

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
    const profile = await updateCustomerPortalProfileRequest(profileId, input, activeRoleForWrite());

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

    await deleteCustomerPortalProfileRequest(profileId, activeRoleForWrite());

    setCustomerProfiles((current) => current.filter((item) => item.id !== profileId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile?.customer_name ?? "Customer"} portal profile was deleted.`
      },
      ...current
    ]);
  };

  if (!storefront || !dashboard) {
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
          customerProfiles={customerProfiles}
          isCartOpen={isCartOpen}
          isAccountOpen={isAccountOpen}
          onAddToCart={addToCart}
          onChangeCategory={setSelectedCategory}
          onChangeSearch={setSearchTerm}
          onCheckout={submitCheckout}
          onCloseAccount={() => setIsAccountOpen(false)}
          onClearCart={clearCart}
          onCloseCart={() => setIsCartOpen(false)}
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
          orders={orders}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          storefront={storefront}
        />
      ) : (
        <AdminView
          activityFeed={activityFeed}
          activeRoleId={activeRoleId}
          adminTab={adminTab}
          categories={storefront.categories}
          customerProfiles={customerProfiles}
          dashboard={dashboard}
          discount={discount}
          fulfillmentByStage={fulfillmentByStage}
          highValueAccounts={highValueAccounts}
          onApplyCampaign={applyCampaign}
          onBackToStore={() => openView("store")}
          onChangeDiscount={setDiscount}
          onChangeRole={setActiveRoleId}
          onChangeTab={setAdminTab}
          onCreateAdminOrder={createAdminOrder}
          onCreateCategory={createCategory}
          onCreateCustomerPortalProfile={createCustomerPortalProfile}
          onCreateInvoiceFromOrder={createInvoiceFromOrder}
          onCreatePayment={createPayment}
          onCreateProduct={createProduct}
          onCreateRole={createRole}
          onDeleteAdminOrder={deleteAdminOrder}
          onDeleteCustomerPortalProfile={deleteCustomerPortalProfile}
          onDeletePayment={deletePayment}
          onDeleteRole={deleteRole}
          onRecordInvoicePayment={recordInvoicePayment}
          onRunSync={runSupplierSync}
          onSelectCampaign={(name) =>
            setSelectedCampaign(dashboard.campaigns.find((item) => item.name === name) ?? null)
          }
          onUpdateAdminOrder={updateAdminOrder}
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
          products={storefront.products}
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
  customerProfiles: CustomerPortalProfile[];
  filteredProducts: Product[];
  isAccountOpen: boolean;
  isCartOpen: boolean;
  onAddToCart: (product: Product) => void;
  onChangeCategory: (slug: string) => void;
  onChangeSearch: (value: string) => void;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onCloseAccount: () => void;
  onClearCart: () => void;
  onCloseCart: () => void;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  orders: Order[];
  searchTerm: string;
  selectedCategory: string;
  storefront: StorefrontPayload;
};

function StorefrontView({
  cart,
  cartCount,
  customerAccountEmail,
  customerProfiles,
  filteredProducts,
  isAccountOpen,
  isCartOpen,
  onAddToCart,
  onChangeCategory,
  onChangeSearch,
  onCheckout,
  onCloseAccount,
  onClearCart,
  onCloseCart,
  onOpenAdmin,
  onOpenAccount,
  onOpenCart,
  onRemoveFromCart,
  onUpdateQuantity,
  orders,
  searchTerm,
  selectedCategory,
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

                  <div className="product-visual">
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
        orders={orders}
        profiles={customerProfiles}
        onClose={onCloseAccount}
      />
    </>
  );
}

type AccountDrawerProps = {
  open: boolean;
  customerAccountEmail: string;
  orders: Order[];
  profiles: CustomerPortalProfile[];
  onClose: () => void;
};

function AccountDrawer({ open, customerAccountEmail, orders, profiles, onClose }: AccountDrawerProps) {
  if (!open) {
    return null;
  }

  const storedEmail = customerAccountEmail.trim().toLowerCase();
  const storedAccountExists =
    storedEmail.length > 0 &&
    (profiles.some((item) => item.customer_email.toLowerCase() === storedEmail) ||
      orders.some((order) => order.customer_email.toLowerCase() === storedEmail));
  const fallbackEmail = profiles[0]?.customer_email ?? orders[0]?.customer_email ?? "";
  const normalizedEmail = storedAccountExists
    ? storedEmail
    : fallbackEmail.trim().toLowerCase();
  const profile =
    profiles.find((item) => item.customer_email.toLowerCase() === normalizedEmail) ?? null;
  const accountOrders = orders
    .filter((order) => order.customer_email.toLowerCase() === normalizedEmail)
    .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
  const hasAccount = profile !== null || accountOrders.length > 0;
  const accountName = profile?.customer_name ?? accountOrders[0]?.customer_name ?? "My Account";
  const lifetimePurchaseCents =
    profile?.lifetime_purchase_cents ??
    accountOrders.reduce((sum, order) => sum + order.subtotal_cents, 0);
  const totalOrders = profile?.total_orders ?? accountOrders.length;

  const close = () => {
    onClose();
  };

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

        {hasAccount ? (
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
                        <strong>{currencyFromCents(order.subtotal_cents)}</strong>
                      </div>
                      <ul className="account-line-items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.product_id}`}>
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
            <p>No customer account is active yet.</p>
            <button className="outline-button" onClick={close}>
              Continue Shopping
            </button>
          </div>
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
  const [form, setForm] = useState({ customer_name: "", customer_email: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) {
    return null;
  }

  const subtotalCents = cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);

  const close = () => {
    setStage("cart");
    setForm({ customer_name: "", customer_email: "" });
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
  categories: Category[];
  customerProfiles: CustomerPortalProfile[];
  dashboard: AdminDashboardPayload;
  discount: number;
  fulfillmentByStage: Record<string, FulfillmentItem[]>;
  highValueAccounts: { name: string; detail: string }[];
  onApplyCampaign: () => void;
  onBackToStore: () => void;
  onChangeDiscount: (value: number) => void;
  onChangeRole: (roleId: number) => void;
  onChangeTab: (tab: AdminTab) => void;
  onCreateAdminOrder: (input: CreateOrderInput) => Promise<Order>;
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
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onRecordInvoicePayment: (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ) => Promise<Invoice>;
  onRunSync: () => void;
  onSelectCampaign: (name: string) => void;
  onUpdateAdminOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  onUpdateCustomerPortalProfile: (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onUpdateInvoiceBilling: (invoiceId: number, input: UpdateInvoiceBillingInput) => Promise<Invoice>;
  onUpdatePayment: (paymentId: number, input: UpdatePaymentInput) => Promise<Payment>;
  onUpdateProduct: (productId: number, input: UpdateProductInput) => Promise<Product>;
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
  categories,
  customerProfiles,
  dashboard,
  discount,
  fulfillmentByStage,
  highValueAccounts,
  onApplyCampaign,
  onBackToStore,
  onChangeDiscount,
  onChangeRole,
  onChangeTab,
  onCreateAdminOrder,
  onCreateCategory,
  onCreateCustomerPortalProfile,
  onCreateInvoiceFromOrder,
  onCreatePayment,
  onCreateProduct,
  onCreateRole,
  onDeleteAdminOrder,
  onDeleteCustomerPortalProfile,
  onDeletePayment,
  onDeleteRole,
  onRecordInvoicePayment,
  onRunSync,
  onSelectCampaign,
  onUpdateAdminOrder,
  onUpdateCustomerPortalProfile,
  onUpdateInvoiceBilling,
  onUpdatePayment,
  onUpdateProduct,
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
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    slug: "",
    name: "",
    teaser: ""
  });
  const [productForm, setProductForm] = useState<ProductFormState>(() => emptyProductForm(categories));
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [productFeedback, setProductFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const activeRole = permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canCreateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "create");
  const canUpdateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "update");
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

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    setProductForm((current) =>
      categories.some((category) => category.slug === current.category_slug)
        ? current
        : { ...current, category_slug: categories[0].slug }
    );
  }, [categories]);

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

  const handleCreateCategory = async () => {
    if (!canCreateCatalog) {
      setCategoryFeedback({ kind: "error", message: "The active role cannot create catalog records." });
      return;
    }

    setIsCreatingCategory(true);
    setCategoryFeedback(null);

    try {
      const payload: CreateCategoryInput = {
        slug: slugify(categoryForm.slug || categoryForm.name),
        name: categoryForm.name.trim(),
        teaser: categoryForm.teaser.trim()
      };

      const category = await onCreateCategory(payload);

      setCategoryForm({ slug: "", name: "", teaser: "" });
      setProductForm((current) => ({ ...current, category_slug: category.slug }));
      setIsCategoryModalOpen(false);
      setCategoryFeedback({ kind: "success", message: `${category.name} is ready for products.` });
    } catch (error) {
      setCategoryFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create category."
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!canCreateCatalog) {
      setProductFeedback({ kind: "error", message: "The active role cannot create catalog records." });
      return;
    }

    setIsCreatingProduct(true);
    setProductFeedback(null);

    try {
      const product = await onCreateProduct(productInputFromForm(productForm));

      setProductForm(emptyProductForm(categories));
      setIsProductModalOpen(false);
      setProductFeedback({
        kind: "success",
        message: product.featured
          ? `${product.name} is live on the storefront.`
          : `${product.name} was created and saved as hidden.`
      });
    } catch (error) {
      setProductFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create product."
      });
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const startCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm(categories));
    setProductFeedback(null);
    setIsProductModalOpen(true);
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm(productFormFromProduct(product));
    setProductFeedback(null);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setProductFeedback(null);
  };

  const handleUpdateProduct = async () => {
    if (editingProductId === null) {
      return;
    }

    if (!canUpdateCatalog) {
      setProductFeedback({ kind: "error", message: "The active role cannot update catalog records." });
      return;
    }

    setIsSavingProduct(true);
    setProductFeedback(null);

    try {
      const product = await onUpdateProduct(editingProductId, productInputFromForm(productForm));
      setIsProductModalOpen(false);
      setEditingProductId(null);
      setProductFeedback({ kind: "success", message: `${product.name} was updated.` });
    } catch (error) {
      setProductFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update product."
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

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
  const categoryNameBySlug = new Map(categories.map((category) => [category.slug, category.name]));
  const catalogProductFields = productFields(categories);
  const editingProduct =
    editingProductId === null
      ? null
      : products.find((product) => product.id === editingProductId) ?? null;
  const productColumns = [
    {
      key: "name",
      label: "Product",
      sortValue: (product: Product) => product.name,
      render: (product: Product) => (
        <div className="table-cell-main">
          <strong>{product.name}</strong>
          <span>{product.tone}</span>
        </div>
      )
    },
    {
      key: "category",
      label: "Category",
      sortValue: (product: Product) =>
        categoryNameBySlug.get(product.category_slug) ?? product.category_slug,
      render: (product: Product) =>
        categoryNameBySlug.get(product.category_slug) ?? product.category_slug
    },
    {
      key: "price",
      label: "Price",
      align: "right" as const,
      sortValue: (product: Product) => product.price_cents,
      render: (product: Product) => currencyFromCents(product.price_cents)
    },
    {
      key: "badge",
      label: "Badge",
      sortValue: (product: Product) => product.badge,
      render: (product: Product) => product.badge
    },
    {
      key: "visibility",
      label: "Visibility",
      sortValue: (product: Product) => product.featured,
      render: (product: Product) => (
        <span className={`status-pill ${product.featured ? "live" : ""}`}>
          {product.featured ? "Live" : "Hidden"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (product: Product) => (
        <button
          className="outline-button table-action"
          disabled={!canUpdateCatalog}
          onClick={() => startEditProduct(product)}
          type="button"
        >
          Edit
        </button>
      )
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
          <p className="eyebrow">Active role</p>
          <h3>{activeRole?.name ?? "Loading roles"}</h3>
          {permissions ? (
            <label className="role-switcher">
              Role
              <select
                value={activeRoleId ?? ""}
                onChange={(event) => onChangeRole(Number(event.target.value))}
              >
                {permissions.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p>{activeRole?.description ?? "Permission data is loading."}</p>
          {activeRole?.is_super_admin ? <span className="status-pill live">Ultimate access</span> : null}
        </div>

        <button className="outline-button" onClick={onBackToStore}>
          Back to Storefront
        </button>
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

        {adminTab === "overview" ? (
          <section className="admin-section active">
            <div className="metric-grid">
              {dashboard.metrics.map((metric) => (
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
              <span className="status-pill live">Real time</span>
            </div>
            <div className="fulfillment-grid">
              {Object.entries(fulfillmentByStage).map(([stage, items]) => (
                <article className="fulfillment-column" key={stage}>
                  <h4>{stage}</h4>
                  {items.map((item) => (
                    <div className="task-card" key={item.title}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                  ))}
                </article>
              ))}
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
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Catalog manager</p>
                <h3>Create categories and products</h3>
              </div>
              <span className={`status-pill ${canCreateCatalog ? "live" : ""}`}>
                {canCreateCatalog ? "Writable" : "Read only"}
              </span>
            </div>

            <div className="record-toolbar">
              <button
                className="outline-button"
                disabled={!canCreateCatalog}
                onClick={() => {
                  setCategoryForm({ slug: "", name: "", teaser: "" });
                  setCategoryFeedback(null);
                  setIsCategoryModalOpen(true);
                }}
                type="button"
              >
                Create Category
              </button>
              <button
                className="solid-button"
                disabled={!canCreateCatalog}
                onClick={startCreateProduct}
                type="button"
              >
                Create Product
              </button>
            </div>

            {categoryFeedback && !isCategoryModalOpen ? (
              <p className={`catalog-feedback ${categoryFeedback.kind}`}>{categoryFeedback.message}</p>
            ) : null}
            {productFeedback && !isProductModalOpen ? (
              <p className={`catalog-feedback ${productFeedback.kind}`}>{productFeedback.message}</p>
            ) : null}

            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Current categories</p>
                    <h3>Available department slugs</h3>
                  </div>
                </div>
                <div className="catalog-list">
                  {categories.map((category) => (
                    <div key={category.slug}>
                      <strong>{category.name}</strong>
                      <span>{category.slug}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Storefront products</p>
                    <h3>Product inventory table</h3>
                  </div>
                </div>
                <ManagementTable
                  columns={productColumns}
                  emptyMessage="No products have been merchandised yet."
                  getRowKey={(product) => product.id}
                  initialSortKey="name"
                  rows={products}
                  tableLabel="Product inventory management table"
                />
              </article>
            </div>

            <RecordModal
              eyebrow="New category"
              isOpen={isCategoryModalOpen}
              onClose={() => {
                setIsCategoryModalOpen(false);
                setCategoryFeedback(null);
              }}
              statusLabel={canCreateCatalog ? "Writable" : "Read only"}
              statusTone={canCreateCatalog ? "live" : undefined}
              title="Add a department to the storefront"
            >
              <RecordForm
                disabled={!canCreateCatalog}
                feedback={
                  categoryFeedback ? (
                    <p className={`catalog-feedback ${categoryFeedback.kind}`}>{categoryFeedback.message}</p>
                  ) : null
                }
                fields={categoryFields}
                isSubmitting={isCreatingCategory}
                onCancel={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryFeedback(null);
                }}
                onChange={setCategoryForm}
                onSubmit={() => void handleCreateCategory()}
                submitLabel="Create Category"
                values={categoryForm}
              />
            </RecordModal>

            <RecordModal
              eyebrow={editingProductId === null ? "New product" : "Editing product"}
              isOpen={isProductModalOpen}
              onClose={closeProductModal}
              size="wide"
              statusLabel={editingProductId === null ? (canCreateCatalog ? "Writable" : "Read only") : canUpdateCatalog ? "Writable" : "Read only"}
              statusTone={editingProductId === null ? (canCreateCatalog ? "live" : undefined) : canUpdateCatalog ? "live" : undefined}
              title={
                editingProductId === null
                  ? "Publish a new storefront item"
                  : editingProduct?.name ?? "Edit storefront item"
              }
            >
              <RecordForm
                disabled={editingProductId === null ? !canCreateCatalog : !canUpdateCatalog}
                feedback={
                  productFeedback ? (
                    <p className={`catalog-feedback ${productFeedback.kind}`}>{productFeedback.message}</p>
                  ) : null
                }
                fields={catalogProductFields}
                isSubmitting={editingProductId === null ? isCreatingProduct : isSavingProduct}
                onCancel={closeProductModal}
                onChange={setProductForm}
                onSubmit={() =>
                  editingProductId === null
                    ? void handleCreateProduct()
                    : void handleUpdateProduct()
                }
                submitLabel={editingProductId === null ? "Create Product" : "Save Product"}
                values={productForm}
              />
            </RecordModal>
          </section>
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
          <PermissionsPanel
            activeRoleId={activeRoleId}
            onChangeRole={onChangeRole}
            onCreateRole={onCreateRole}
            onDeleteRole={onDeleteRole}
            onUpdateRole={onUpdateRole}
            onUpdateRolePermission={onUpdateRolePermission}
            permissions={permissions}
          />
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
        </section>
      </section>
    </main>
  );
}
