import { type FormEvent, startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  checkout as checkoutRequest,
  createAdminOrder as createAdminOrderRequest,
  createCategory as createCategoryRequest,
  createCustomerPortalProfile as createCustomerPortalProfileRequest,
  createPayment as createPaymentRequest,
  createProduct as createProductRequest,
  createRole as createRoleRequest,
  deleteAdminOrder as deleteAdminOrderRequest,
  deleteCustomerPortalProfile as deleteCustomerPortalProfileRequest,
  deletePayment as deletePaymentRequest,
  deleteRole as deleteRoleRequest,
  fetchAdminDashboard,
  fetchCustomerPortalProfiles,
  fetchOrders,
  fetchPayments,
  fetchPermissions,
  fetchStorefront,
  updateAdminOrder as updateAdminOrderRequest,
  updateCustomerPortalProfile as updateCustomerPortalProfileRequest,
  updatePayment as updatePaymentRequest,
  updateRole as updateRoleRequest,
  updateRolePermission as updateRolePermissionRequest
} from "./lib/api";
import { OrderControlPanel } from "./modules/orders/components/OrderControlPanel";
import { PaymentManagementPanel } from "./modules/payments/components/PaymentManagementPanel";
import { PermissionsPanel } from "./modules/permissions/components/PermissionsPanel";
import { currencyFromCents, formatOrderDate } from "./shared/formatters";
import type {
  ActivityItem,
  AdminDashboardPayload,
  CampaignOption,
  CartItem,
  Category,
  CreateCategoryInput,
  CreateCustomerPortalProfileInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateProductInput,
  CreateRoleInput,
  CustomerPortalProfile,
  FulfillmentItem,
  Order,
  Payment,
  PermissionsPayload,
  Product,
  Role,
  RolePagePermission,
  StorefrontPayload,
  UpdateCustomerPortalProfileInput,
  UpdatePaymentInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput
} from "./types";

const CART_STORAGE_KEY = "depot-cart";

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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreate) {
      setFeedback({ kind: "error", message: "The active role cannot create customer profiles." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const profile = await onCreateCustomerPortalProfile(customerPortalInputFromForm(createForm));

      setCreateForm(emptyCustomerPortalForm);
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

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

      <div className="customer-portal-grid">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New customer</p>
              <h3>Create portal profile</h3>
            </div>
          </div>
          <form className="admin-form" onSubmit={handleCreate}>
            <CustomerPortalFormFields
              disabled={!canCreate}
              form={createForm}
              onChange={setCreateForm}
            />
            {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}
            <div className="form-actions">
              <button className="solid-button" disabled={!canCreate || isCreating} type="submit">
                {isCreating ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>
        </article>

        <div className="customer-card-grid">
          {profiles.map((profile) => {
            const linkedOrders = orders.filter(
              (order) =>
                order.customer_email.toLowerCase() === profile.customer_email.toLowerCase()
            );
            const isEditing = editingProfileId === profile.id;

            return (
              <article className="customer-card" key={profile.id}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">{profile.membership_tier}</p>
                    <h3>{profile.customer_name}</h3>
                  </div>
                  <span className="status-pill">{profile.points_balance.toLocaleString()} pts</span>
                </div>

                {isEditing && editForm ? (
                  <form className="admin-form" onSubmit={handleUpdate}>
                    <CustomerPortalFormFields
                      disabled={!canUpdate}
                      form={editForm}
                      onChange={setEditForm}
                    />
                    <div className="form-actions split-actions">
                      <button
                        className="solid-button"
                        disabled={!canUpdate || savingProfileId === profile.id}
                        type="submit"
                      >
                        {savingProfileId === profile.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="outline-button"
                        onClick={() => {
                          setEditingProfileId(null);
                          setEditForm(null);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="customer-stat-grid">
                      <div>
                        <span>Email</span>
                        <strong>{profile.customer_email}</strong>
                      </div>
                      <div>
                        <span>Purchase value</span>
                        <strong>{currencyFromCents(profile.lifetime_purchase_cents)}</strong>
                      </div>
                      <div>
                        <span>Orders</span>
                        <strong>{profile.total_orders.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>Last purchase</span>
                        <strong>
                          {profile.last_purchase_at
                            ? formatOrderDate(profile.last_purchase_at)
                            : "No purchases yet"}
                        </strong>
                      </div>
                    </div>

                    <div className="customer-purchase-list">
                      {linkedOrders.length === 0 ? (
                        <p>No linked checkout orders.</p>
                      ) : (
                        linkedOrders.slice(0, 3).map((order) => (
                          <div key={order.id}>
                            <strong>Order #{order.id}</strong>
                            <span>{currencyFromCents(order.subtotal_cents)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="form-actions split-actions">
                      <button
                        className="outline-button"
                        disabled={!canUpdate}
                        onClick={() => startEditing(profile)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="outline-button danger-button"
                        disabled={!canDelete || deletingProfileId === profile.id}
                        onClick={() => void handleDelete(profile)}
                        type="button"
                      >
                        {deletingProfileId === profile.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
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
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOption | null>(null);
  const [discount, setDiscount] = useState(25);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerPortalProfile[]>([]);
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
      fetchCustomerPortalProfiles(),
      fetchPermissions()
    ]).then(
      ([storefrontData, dashboardData, ordersData, paymentsData, customerProfileData, permissionsData]) => {
        setStorefront(storefrontData);
        setDashboard(dashboardData);
        setSelectedCampaign(dashboardData.campaigns[0] ?? null);
        setActivityFeed(dashboardData.activity);
        setOrders(ordersData);
        setPayments(paymentsData);
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
          filteredProducts={filteredProducts}
          isCartOpen={isCartOpen}
          onAddToCart={addToCart}
          onChangeCategory={setSelectedCategory}
          onChangeSearch={setSearchTerm}
          onCheckout={submitCheckout}
          onClearCart={clearCart}
          onCloseCart={() => setIsCartOpen(false)}
          onOpenAdmin={() => openView("admin")}
          onOpenCart={() => setIsCartOpen(true)}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
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
          onCreatePayment={createPayment}
          onCreateProduct={createProduct}
          onCreateRole={createRole}
          onDeleteAdminOrder={deleteAdminOrder}
          onDeleteCustomerPortalProfile={deleteCustomerPortalProfile}
          onDeletePayment={deletePayment}
          onDeleteRole={deleteRole}
          onRunSync={runSupplierSync}
          onSelectCampaign={(name) =>
            setSelectedCampaign(dashboard.campaigns.find((item) => item.name === name) ?? null)
          }
          onUpdateAdminOrder={updateAdminOrder}
          onUpdatePayment={updatePayment}
          onUpdateRole={updateRole}
          onUpdateRolePermission={updateRolePermission}
          orders={orders}
          payments={payments}
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
  filteredProducts: Product[];
  isCartOpen: boolean;
  onAddToCart: (product: Product) => void;
  onChangeCategory: (slug: string) => void;
  onChangeSearch: (value: string) => void;
  onCheckout: (input: CreateOrderInput) => Promise<Order>;
  onClearCart: () => void;
  onCloseCart: () => void;
  onOpenAdmin: () => void;
  onOpenCart: () => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  searchTerm: string;
  selectedCategory: string;
  storefront: StorefrontPayload;
};

function StorefrontView({
  cart,
  cartCount,
  filteredProducts,
  isCartOpen,
  onAddToCart,
  onChangeCategory,
  onChangeSearch,
  onCheckout,
  onClearCart,
  onCloseCart,
  onOpenAdmin,
  onOpenCart,
  onRemoveFromCart,
  onUpdateQuantity,
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
          <button className="outline-button">Select Store</button>
          <button className="outline-button">My Account</button>
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
    </>
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
  onCreatePayment: (input: CreatePaymentInput) => Promise<Payment>;
  onCreateProduct: (input: CreateProductInput) => Promise<Product>;
  onCreateRole: (input: CreateRoleInput) => Promise<Role>;
  onDeleteAdminOrder: (orderId: number) => Promise<void>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onRunSync: () => void;
  onSelectCampaign: (name: string) => void;
  onUpdateAdminOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  onUpdateCustomerPortalProfile: (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onUpdatePayment: (paymentId: number, input: UpdatePaymentInput) => Promise<Payment>;
  onUpdateRole: (roleId: number, input: UpdateRoleInput) => Promise<Role>;
  onUpdateRolePermission: (input: UpdateRolePagePermissionInput) => Promise<RolePagePermission>;
  orders: Order[];
  payments: Payment[];
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
  onCreatePayment,
  onCreateProduct,
  onCreateRole,
  onDeleteAdminOrder,
  onDeleteCustomerPortalProfile,
  onDeletePayment,
  onDeleteRole,
  onRunSync,
  onSelectCampaign,
  onUpdateAdminOrder,
  onUpdateCustomerPortalProfile,
  onUpdatePayment,
  onUpdateRole,
  onUpdateRolePermission,
  orders,
  payments,
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
  const [productForm, setProductForm] = useState({
    name: "",
    category_slug: categories[0]?.slug ?? "all",
    price: "",
    badge: "",
    description: "",
    tone: "",
    featured: true
  });
  const [categoryFeedback, setCategoryFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [productFeedback, setProductFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const activeRole = permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canCreateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "create");
  const canCreateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "create");
  const canUpdateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "update");
  const canDeleteCustomers = canAccess(permissions, activeRoleId, "admin-customers", "delete");
  const canCreateOrders = canAccess(permissions, activeRoleId, "admin-orders", "create");
  const canUpdateOrders = canAccess(permissions, activeRoleId, "admin-orders", "update");
  const canDeleteOrders = canAccess(permissions, activeRoleId, "admin-orders", "delete");
  const canCreatePayments = canAccess(permissions, activeRoleId, "admin-payments", "create");
  const canUpdatePayments = canAccess(permissions, activeRoleId, "admin-payments", "update");
  const canDeletePayments = canAccess(permissions, activeRoleId, "admin-payments", "delete");
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

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateCatalog) {
      setProductFeedback({ kind: "error", message: "The active role cannot create catalog records." });
      return;
    }

    setIsCreatingProduct(true);
    setProductFeedback(null);

    try {
      const normalizedPrice = Math.round(Number(productForm.price) * 100);

      if (Number.isNaN(normalizedPrice)) {
        throw new Error("Enter a valid product price.");
      }

      const product = await onCreateProduct({
        name: productForm.name.trim(),
        category_slug: productForm.category_slug,
        price_cents: normalizedPrice,
        badge: productForm.badge.trim(),
        description: productForm.description.trim(),
        tone: productForm.tone.trim(),
        featured: productForm.featured
      });

      setProductForm((current) => ({
        ...current,
        name: "",
        price: "",
        badge: "",
        description: "",
        tone: "",
        featured: true
      }));
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
            <div className="inventory-table">
              <div className="inventory-row inventory-header">
                <strong>Department</strong>
                <strong>On Hand</strong>
                <strong>Lead Region</strong>
                <strong>Status</strong>
                <strong>Notes</strong>
              </div>
              {dashboard.inventory.map((item) => (
                <div className="inventory-row" key={item.department}>
                  <span>{item.department}</span>
                  <span>{item.on_hand}</span>
                  <span>{item.lead_region}</span>
                  <span
                    className={`status-pill ${
                      item.status === "Healthy" ? "live" : item.status === "Low" ? "warning" : ""
                    }`}
                  >
                    {item.status}
                  </span>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
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

            <div className="catalog-grid">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">New category</p>
                    <h3>Add a department to the storefront</h3>
                  </div>
                  <span className="status-pill">{categories.length} total</span>
                </div>

                <form className="admin-form" onSubmit={handleCreateCategory}>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      Category name
                      <input
                        disabled={!canCreateCatalog}
                        value={categoryForm.name}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Ceiling Fans"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Slug
                      <input
                        disabled={!canCreateCatalog}
                        value={categoryForm.slug}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                        }
                        placeholder="Auto-generated if left blank"
                      />
                    </label>
                  </div>

                  <label className="admin-field">
                    Teaser
                    <textarea
                      disabled={!canCreateCatalog}
                      value={categoryForm.teaser}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, teaser: event.target.value }))
                      }
                      placeholder="Fans, lighting and comfort upgrades for every room."
                      rows={4}
                      required
                    />
                  </label>

                  {categoryFeedback ? (
                    <p className={`catalog-feedback ${categoryFeedback.kind}`}>{categoryFeedback.message}</p>
                  ) : null}

                  <div className="form-actions">
                    <button
                      className="solid-button"
                      disabled={!canCreateCatalog || isCreatingCategory}
                      type="submit"
                    >
                      {isCreatingCategory ? "Creating..." : "Create Category"}
                    </button>
                  </div>
                </form>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">New product</p>
                    <h3>Publish a new storefront item</h3>
                  </div>
                  <span className="status-pill">{products.length} featured</span>
                </div>

                <form className="admin-form" onSubmit={handleCreateProduct}>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      Product name
                      <input
                        disabled={!canCreateCatalog}
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Home Decorators Ceiling Fan"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Category
                      <select
                        disabled={!canCreateCatalog}
                        value={productForm.category_slug}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, category_slug: event.target.value }))
                        }
                      >
                        {categories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      Price
                      <input
                        disabled={!canCreateCatalog}
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, price: event.target.value }))
                        }
                        placeholder="249.00"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Badge
                      <input
                        disabled={!canCreateCatalog}
                        value={productForm.badge}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, badge: event.target.value }))
                        }
                        placeholder="New Arrival"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Brand / tone
                      <input
                        disabled={!canCreateCatalog}
                        value={productForm.tone}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, tone: event.target.value }))
                        }
                        placeholder="Home Decorators Collection"
                        required
                      />
                    </label>
                  </div>

                  <label className="admin-field">
                    Description
                    <textarea
                      disabled={!canCreateCatalog}
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Modern finish, integrated light kit and remote control for easy installs."
                      rows={4}
                      required
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      checked={productForm.featured}
                      disabled={!canCreateCatalog}
                      type="checkbox"
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, featured: event.target.checked }))
                      }
                    />
                    Show this product on the storefront immediately
                  </label>

                  {productFeedback ? (
                    <p className={`catalog-feedback ${productFeedback.kind}`}>{productFeedback.message}</p>
                  ) : null}

                  <div className="form-actions">
                    <button
                      className="solid-button"
                      disabled={!canCreateCatalog || isCreatingProduct}
                      type="submit"
                    >
                      {isCreatingProduct ? "Creating..." : "Create Product"}
                    </button>
                  </div>
                </form>
              </article>
            </div>

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
                    <h3>Recently merchandised items</h3>
                  </div>
                </div>
                <div className="catalog-list">
                  {products.slice(-6).reverse().map((product) => (
                    <div key={product.id}>
                      <strong>{product.name}</strong>
                      <span>{product.featured ? "Live on storefront" : "Saved as hidden"}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
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
