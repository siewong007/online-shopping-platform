import { useMemo, useState } from "react";

import { ConfirmModal } from "../../shared/components/ConfirmModal";
import { ManagementTable } from "../../shared/components/ManagementTable";
import { RecordForm, RecordModal, type RecordFormField } from "../../shared/components/RecordModal";
import { currencyFromCents, formatOrderDate } from "../../shared/formatters";
import { useNotifications } from "../../shared/notifications";
import type {
  CreateCustomerPortalProfileInput,
  CustomerPortalProfile,
  Order,
  UpdateCustomerPortalProfileInput
} from "../../types";

const membershipTiers = ["Bronze", "Silver", "Gold", "Pro Xtra", "VIP"];

const tierFilterOptions = ["All", ...membershipTiers];

function membershipTierClass(tier: string): string {
  const slug = tier.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (tier === "VIP" || tier === "Pro Xtra") {
    return `live tier-badge tier-badge--${slug}`;
  }
  if (tier === "Gold") {
    return `warning tier-badge tier-badge--${slug}`;
  }
  return `tier-badge tier-badge--${slug}`;
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
    validate: (value) => (Number.isInteger(Number(value)) ? null : "Points must be a whole number.")
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
    validate: (value) => (Number.isInteger(Number(value)) ? null : "Orders must be a whole number.")
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

export function CustomerPortalPanel({
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
  const [pendingDeleteProfile, setPendingDeleteProfile] = useState<CustomerPortalProfile | null>(
    null
  );
  const [tierFilter, setTierFilter] = useState<string>("All");

  const filteredProfiles = useMemo(
    () =>
      tierFilter === "All"
        ? profiles
        : profiles.filter((profile) => profile.membership_tier === tierFilter),
    [profiles, tierFilter]
  );

  const totalPoints = profiles.reduce((sum, profile) => sum + profile.points_balance, 0);
  const totalPurchaseCents = profiles.reduce(
    (sum, profile) => sum + profile.lifetime_purchase_cents,
    0
  );
  const totalOrders = profiles.reduce((sum, profile) => sum + profile.total_orders, 0);

  const handleCreate = async () => {
    if (!canCreate) {
      notify({
        severity: "error",
        title: "Customer not created",
        message: "The active role cannot create customer profiles.",
        scope: "customer-profiles",
        dedupeKey: "customer-profiles:create:permission"
      });
      return;
    }

    setIsCreating(true);

    try {
      const profile = await onCreateCustomerPortalProfile(customerPortalInputFromForm(createForm));

      setCreateForm(emptyCustomerPortalForm);
      setIsCreateOpen(false);
      notify({
        severity: "success",
        title: "Customer created",
        message: `${profile.customer_name} was created successfully.`,
        scope: "customer-profiles",
        dedupeKey: `customer-profiles:${profile.id}:create:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "create customer profile",
        scope: "customer-profiles",
        dedupeKey: "customer-profiles:create:error"
      });
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
      notify({
        severity: "error",
        title: "Customer not updated",
        message: "The active role cannot update customer profiles.",
        scope: "customer-profiles",
        dedupeKey: "customer-profiles:update:permission"
      });
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
      notify({
        severity: "success",
        title: "Customer updated",
        message: `${profile.customer_name} was updated successfully.`,
        scope: "customer-profiles",
        dedupeKey: `customer-profiles:${profile.id}:update:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "update customer profile",
        scope: "customer-profiles",
        dedupeKey: `customer-profiles:${editingProfileId}:update:error`
      });
    } finally {
      setSavingProfileId(null);
    }
  };

  const requestDelete = (profile: CustomerPortalProfile) => {
    if (!canDelete) {
      notify({
        severity: "error",
        title: "Customer not deleted",
        message: "The active role cannot delete customer profiles.",
        scope: "customer-profiles",
        dedupeKey: "customer-profiles:delete:permission"
      });
      return;
    }

    setPendingDeleteProfile(profile);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteProfile) {
      return;
    }

    const profile = pendingDeleteProfile;
    setDeletingProfileId(profile.id);

    try {
      await onDeleteCustomerPortalProfile(profile.id);
      setPendingDeleteProfile(null);
      notify({
        severity: "success",
        title: "Customer deleted",
        message: `${profile.customer_name} was deleted successfully.`,
        scope: "customer-profiles",
        dedupeKey: `customer-profiles:${profile.id}:delete:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "delete customer profile",
        scope: "customer-profiles",
        dedupeKey: `customer-profiles:${profile.id}:delete:error`
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
      render: (profile: CustomerPortalProfile) => (
        <span className={`status-pill ${membershipTierClass(profile.membership_tier)}`}>
          {profile.membership_tier}
        </span>
      )
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
      render: (profile: CustomerPortalProfile) => currencyFromCents(profile.lifetime_purchase_cents)
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
            onClick={() => requestDelete(profile)}
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
      : (profiles.find((profile) => profile.id === editingProfileId) ?? null);
  const isEditOpen = Boolean(editingProfile && editForm);
  const closeEdit = () => {
    setEditingProfileId(null);
    setEditForm(null);
  };

  return (
    <section className="admin-section active">
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
            <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
              {canCreate || canUpdate || canDelete ? "Writable" : "Read only"}
            </span>
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
          emptyMessage={
            profiles.length === 0
              ? "No customer profiles have been created yet."
              : "No customer profiles match the current filter."
          }
          filterSlot={
            <div className="admin-filter-pills" role="group" aria-label="Filter customers by tier">
              {tierFilterOptions.map((tier) => {
                const count =
                  tier === "All"
                    ? profiles.length
                    : profiles.filter((profile) => profile.membership_tier === tier).length;
                const isActive = tierFilter === tier;
                return (
                  <button
                    aria-pressed={isActive}
                    className={`admin-filter-pill${isActive ? " is-active" : ""}`}
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    type="button"
                  >
                    {tier} ({count})
                  </button>
                );
              })}
            </div>
          }
          getRowKey={(profile) => profile.id}
          getSearchText={(profile) =>
            [profile.id, profile.customer_name, profile.customer_email, profile.membership_tier]
              .filter(Boolean)
              .join(" ")
          }
          hasMore={hasMore}
          initialSortKey="name"
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          rows={filteredProfiles}
          searchPlaceholder="Search customer name, email, or tier..."
          tableLabel="Customer profile management table"
        />
      </article>

      <RecordModal
        eyebrow="New customer"
        isBusy={isCreating}
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
        isBusy={Boolean(editingProfile && savingProfileId === editingProfile.id)}
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

      <ConfirmModal
        confirmLabel="Delete customer"
        eyebrow="Customer portal"
        isConfirming={
          pendingDeleteProfile !== null && deletingProfileId === pendingDeleteProfile.id
        }
        isOpen={pendingDeleteProfile !== null}
        message={
          pendingDeleteProfile
            ? `Delete ${pendingDeleteProfile.customer_name}'s customer portal profile (${pendingDeleteProfile.customer_email})?`
            : ""
        }
        onCancel={() => {
          if (deletingProfileId === null) {
            setPendingDeleteProfile(null);
          }
        }}
        onConfirm={confirmDelete}
        title={
          pendingDeleteProfile
            ? `Delete ${pendingDeleteProfile.customer_name}?`
            : "Delete customer profile"
        }
        tone="danger"
      />
    </section>
  );
}
