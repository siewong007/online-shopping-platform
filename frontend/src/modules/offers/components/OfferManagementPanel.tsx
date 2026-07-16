import { useState } from "react";

import { ManagementTable } from "../../../shared/components/ManagementTable";
import {
  RecordForm,
  type RecordFormErrors,
  type RecordFormField,
  RecordModal
} from "../../../shared/components/RecordModal";
import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  DiscountType,
  Promotion,
  UpdatePromotionInput,
  UpdateVoucherInput,
  Voucher
} from "../types";

type OfferFormState = {
  title: string;
  description: string;
  discount_type: "" | DiscountType;
  discount_value: string;
  minimum_subtotal_cents: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_stackable: boolean;
  max_redemptions: string;
};

type PromotionFormState = OfferFormState & {
  label: string;
};

type VoucherFormState = OfferFormState & {
  code: string;
  is_public: boolean;
};

type OfferManagementPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  demoMode: boolean;
  promotions: Promotion[];
  vouchers: Voucher[];
  onCreatePromotion: (input: CreatePromotionInput) => Promise<Promotion>;
  onUpdatePromotion: (promotionId: number, input: UpdatePromotionInput) => Promise<Promotion>;
  onDeletePromotion: (promotionId: number) => Promise<void>;
  onCreateVoucher: (input: CreateVoucherInput) => Promise<Voucher>;
  onUpdateVoucher: (voucherId: number, input: UpdateVoucherInput) => Promise<Voucher>;
  onDeleteVoucher: (voucherId: number) => Promise<void>;
};

function emptyPromotionForm(): PromotionFormState {
  return {
    label: "",
    title: "",
    description: "",
    discount_type: "",
    discount_value: "",
    minimum_subtotal_cents: "0",
    starts_at: "",
    ends_at: "",
    is_active: true,
    is_stackable: false,
    max_redemptions: ""
  };
}

function promotionFormFromRecord(promotion: Promotion): PromotionFormState {
  return {
    label: promotion.label,
    title: promotion.title,
    description: promotion.description,
    discount_type: promotion.discount_type ?? "",
    discount_value: promotion.discount_value === null ? "" : String(promotion.discount_value),
    minimum_subtotal_cents: String(promotion.minimum_subtotal_cents),
    starts_at: promotion.starts_at ?? "",
    ends_at: promotion.ends_at ?? "",
    is_active: promotion.is_active,
    is_stackable: promotion.is_stackable,
    max_redemptions: promotion.max_redemptions === null ? "" : String(promotion.max_redemptions)
  };
}

function emptyVoucherForm(): VoucherFormState {
  return {
    code: "",
    title: "",
    description: "",
    discount_type: "fixed_cents",
    discount_value: "",
    minimum_subtotal_cents: "0",
    starts_at: "",
    ends_at: "",
    is_active: true,
    is_stackable: false,
    max_redemptions: "",
    is_public: false
  };
}

function voucherFormFromRecord(voucher: Voucher): VoucherFormState {
  return {
    code: voucher.code,
    title: voucher.title,
    description: voucher.description,
    discount_type: voucher.discount_type,
    discount_value: String(voucher.discount_value),
    minimum_subtotal_cents: String(voucher.minimum_subtotal_cents),
    starts_at: voucher.starts_at ?? "",
    ends_at: voucher.ends_at ?? "",
    is_active: voucher.is_active,
    is_stackable: voucher.is_stackable,
    max_redemptions: voucher.max_redemptions === null ? "" : String(voucher.max_redemptions),
    is_public: voucher.is_public
  };
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

function optionalNonNegativeInteger(value: string, fieldLabel: string): number | null {
  const text = value.trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} must be a non-negative whole number.`);
  }

  return parsed;
}

function requiredNonNegativeInteger(value: string, fieldLabel: string): number {
  const parsed = optionalNonNegativeInteger(value, fieldLabel);
  if (parsed === null) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return parsed;
}

function promotionInputFromForm(form: PromotionFormState): CreatePromotionInput {
  const discountType = form.discount_type || null;
  const discountValue = optionalNonNegativeInteger(form.discount_value, "Discount value");

  if ((discountType === null) !== (discountValue === null)) {
    throw new Error("Select both a discount type and discount value, or leave both blank for display-only.");
  }

  return {
    label: form.label.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    discount_type: discountType,
    discount_value: discountValue,
    minimum_subtotal_cents: requiredNonNegativeInteger(
      form.minimum_subtotal_cents,
      "Minimum subtotal"
    ),
    starts_at: optionalText(form.starts_at),
    ends_at: optionalText(form.ends_at),
    is_active: form.is_active,
    is_stackable: form.is_stackable,
    max_redemptions: optionalNonNegativeInteger(form.max_redemptions, "Maximum redemptions")
  };
}

function voucherInputFromForm(form: VoucherFormState): CreateVoucherInput {
  const discountValue = requiredNonNegativeInteger(form.discount_value, "Discount value");

  return {
    code: form.code.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    discount_type: form.discount_type || "fixed_cents",
    discount_value: discountValue,
    minimum_subtotal_cents: requiredNonNegativeInteger(
      form.minimum_subtotal_cents,
      "Minimum subtotal"
    ),
    starts_at: optionalText(form.starts_at),
    ends_at: optionalText(form.ends_at),
    is_active: form.is_active,
    is_stackable: form.is_stackable,
    max_redemptions: optionalNonNegativeInteger(form.max_redemptions, "Maximum redemptions"),
    is_public: form.is_public
  };
}

function validateNonNegativeInteger(value: unknown): string | null {
  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return Number.isInteger(Number(text)) && Number(text) >= 0
    ? null
    : "Enter a non-negative whole number.";
}

function validatePromotionForm(values: PromotionFormState): RecordFormErrors<PromotionFormState> {
  const errors: RecordFormErrors<PromotionFormState> = {};
  const hasDiscountType = values.discount_type !== "";
  const hasDiscountValue = values.discount_value.trim().length > 0;

  if (hasDiscountType && !hasDiscountValue) {
    errors.discount_value = "Enter a discount value for the selected type.";
  }

  if (!hasDiscountType && hasDiscountValue) {
    errors.discount_type = "Select a discount type or clear the discount value.";
  }

  return errors;
}

function validateVoucherForm(values: VoucherFormState): RecordFormErrors<VoucherFormState> {
  const errors: RecordFormErrors<VoucherFormState> = {};

  if (!values.discount_type) {
    errors.discount_type = "Select a discount type.";
  }

  if (!values.discount_value.trim()) {
    errors.discount_value = "Enter a discount value.";
  }

  return errors;
}

const promotionFields: RecordFormField<PromotionFormState>[] = [
  { name: "label", label: "Label", required: true, minLength: 2, placeholder: "Seasonal savings" },
  { name: "title", label: "Title", required: true, minLength: 2, placeholder: "Summer project event" },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    minLength: 8,
    rows: 4
  },
  {
    name: "discount_type",
    label: "Discount type",
    type: "select",
    options: [
      { label: "Display only (no checkout discount)", value: "" },
      { label: "Fixed amount (cents)", value: "fixed_cents" },
      { label: "Percentage (basis points)", value: "percent_bps" }
    ]
  },
  {
    name: "discount_value",
    label: "Discount value",
    type: "number",
    min: 0,
    step: "1",
    placeholder: "1500",
    helpText: "Use cents for a fixed amount or basis points for a percentage.",
    validate: validateNonNegativeInteger
  },
  {
    name: "minimum_subtotal_cents",
    label: "Minimum subtotal (cents)",
    type: "number",
    required: true,
    min: 0,
    step: "1",
    validate: validateNonNegativeInteger
  },
  {
    name: "starts_at",
    label: "Starts at",
    helpText: "Optional ISO 8601 timestamp.",
    placeholder: "2026-07-16T09:00:00Z"
  },
  {
    name: "ends_at",
    label: "Ends at",
    helpText: "Optional ISO 8601 timestamp.",
    placeholder: "2026-07-31T23:59:59Z"
  },
  { name: "max_redemptions", label: "Maximum redemptions", type: "number", min: 0, step: "1", validate: validateNonNegativeInteger },
  {
    name: "is_active",
    label: "Active",
    type: "toggle",
    description: "Make this promotion available to qualifying guests."
  },
  {
    name: "is_stackable",
    label: "Stackable",
    type: "toggle",
    description: "Allow this promotion to combine with other eligible offers."
  }
];

const voucherFields: RecordFormField<VoucherFormState>[] = [
  { name: "code", label: "Voucher code", required: true, minLength: 2, placeholder: "SUMMER15" },
  { name: "title", label: "Title", required: true, minLength: 2, placeholder: "Summer savings" },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    minLength: 8,
    rows: 4
  },
  {
    name: "discount_type",
    label: "Discount type",
    type: "select",
    required: true,
    options: [
      { label: "Fixed amount (cents)", value: "fixed_cents" },
      { label: "Percentage (basis points)", value: "percent_bps" }
    ]
  },
  {
    name: "discount_value",
    label: "Discount value",
    type: "number",
    required: true,
    min: 0,
    step: "1",
    placeholder: "1500",
    helpText: "Use cents for a fixed amount or basis points for a percentage.",
    validate: validateNonNegativeInteger
  },
  {
    name: "minimum_subtotal_cents",
    label: "Minimum subtotal (cents)",
    type: "number",
    required: true,
    min: 0,
    step: "1",
    validate: validateNonNegativeInteger
  },
  {
    name: "starts_at",
    label: "Starts at",
    helpText: "Optional ISO 8601 timestamp.",
    placeholder: "2026-07-16T09:00:00Z"
  },
  {
    name: "ends_at",
    label: "Ends at",
    helpText: "Optional ISO 8601 timestamp.",
    placeholder: "2026-07-31T23:59:59Z"
  },
  { name: "max_redemptions", label: "Maximum redemptions", type: "number", min: 0, step: "1", validate: validateNonNegativeInteger },
  {
    name: "is_active",
    label: "Active",
    type: "toggle",
    description: "Make this voucher available to qualifying guests."
  },
  {
    name: "is_stackable",
    label: "Stackable",
    type: "toggle",
    description: "Allow this voucher to combine with other eligible offers."
  },
  {
    name: "is_public",
    label: "Public voucher",
    type: "toggle",
    description: "Allow guests to discover this voucher without a private code share."
  }
];

function formatPercentBps(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value / 100)}%`;
}

function discountSummary(discountType: DiscountType | null, discountValue: number | null): string {
  if (discountType === null || discountValue === null) {
    return "Display only";
  }

  return discountType === "fixed_cents"
    ? `${currencyFromCents(discountValue)} off`
    : `${formatPercentBps(discountValue)} off`;
}

function validitySummary(startsAt: string | null, endsAt: string | null): string {
  const start = startsAt ? `Starts ${formatOrderDate(startsAt)}` : "Starts immediately";
  const end = endsAt ? `Ends ${formatOrderDate(endsAt)}` : "No end date";
  return `${start} · ${end}`;
}

function redemptionSummary(redemptionCount: number, maxRedemptions: number | null): string {
  return maxRedemptions === null
    ? `${redemptionCount} redeemed · Unlimited`
    : `${redemptionCount} / ${maxRedemptions} redeemed`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "The offer change could not be completed. Try again.";
}

function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <section className="record-form-error-summary" role="alert">
      <h4>Offer management error</h4>
      <p>{message}</p>
    </section>
  );
}

function mutationUnavailableMessage(demoMode: boolean, action: string): string {
  return demoMode
    ? "Offer changes are disabled while demo data is active."
    : `The active role cannot ${action}.`;
}

export function OfferManagementPanel({
  canCreate,
  canDelete,
  canUpdate,
  demoMode,
  promotions,
  vouchers,
  onCreatePromotion,
  onUpdatePromotion,
  onDeletePromotion,
  onCreateVoucher,
  onUpdateVoucher,
  onDeleteVoucher
}: OfferManagementPanelProps) {
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(emptyPromotionForm);
  const [voucherForm, setVoucherForm] = useState<VoucherFormState>(emptyVoucherForm);
  const [editingPromotionId, setEditingPromotionId] = useState<number | null>(null);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [deletingPromotionId, setDeletingPromotionId] = useState<number | null>(null);
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreateOffers = canCreate && !demoMode;
  const canUpdateOffers = canUpdate && !demoMode;
  const canDeleteOffers = canDelete && !demoMode;
  const editingPromotion =
    editingPromotionId === null
      ? null
      : promotions.find((promotion) => promotion.id === editingPromotionId) ?? null;
  const editingVoucher =
    editingVoucherId === null
      ? null
      : vouchers.find((voucher) => voucher.id === editingVoucherId) ?? null;
  const promotionCanSave = editingPromotionId === null ? canCreateOffers : canUpdateOffers;
  const voucherCanSave = editingVoucherId === null ? canCreateOffers : canUpdateOffers;
  const isWritable = canCreateOffers || canUpdateOffers || canDeleteOffers;

  const closePromotionModal = () => {
    setIsPromotionModalOpen(false);
    setEditingPromotionId(null);
    setError(null);
  };

  const closeVoucherModal = () => {
    setIsVoucherModalOpen(false);
    setEditingVoucherId(null);
    setError(null);
  };

  const openCreatePromotion = () => {
    if (!canCreateOffers) {
      setError(mutationUnavailableMessage(demoMode, "create promotions"));
      return;
    }

    setEditingPromotionId(null);
    setPromotionForm(emptyPromotionForm());
    setError(null);
    setIsPromotionModalOpen(true);
  };

  const openEditPromotion = (promotion: Promotion) => {
    if (!canUpdateOffers) {
      setError(mutationUnavailableMessage(demoMode, "update promotions"));
      return;
    }

    setEditingPromotionId(promotion.id);
    setPromotionForm(promotionFormFromRecord(promotion));
    setError(null);
    setIsPromotionModalOpen(true);
  };

  const openCreateVoucher = () => {
    if (!canCreateOffers) {
      setError(mutationUnavailableMessage(demoMode, "create vouchers"));
      return;
    }

    setEditingVoucherId(null);
    setVoucherForm(emptyVoucherForm());
    setError(null);
    setIsVoucherModalOpen(true);
  };

  const openEditVoucher = (voucher: Voucher) => {
    if (!canUpdateOffers) {
      setError(mutationUnavailableMessage(demoMode, "update vouchers"));
      return;
    }

    setEditingVoucherId(voucher.id);
    setVoucherForm(voucherFormFromRecord(voucher));
    setError(null);
    setIsVoucherModalOpen(true);
  };

  const handleSavePromotion = async () => {
    if (!promotionCanSave) {
      setError(mutationUnavailableMessage(demoMode, "save promotions"));
      return;
    }

    setIsSavingPromotion(true);
    setError(null);

    try {
      const input = promotionInputFromForm(promotionForm);
      if (editingPromotionId === null) {
        await onCreatePromotion(input);
      } else {
        await onUpdatePromotion(editingPromotionId, input);
      }
      closePromotionModal();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSavingPromotion(false);
    }
  };

  const handleSaveVoucher = async () => {
    if (!voucherCanSave) {
      setError(mutationUnavailableMessage(demoMode, "save vouchers"));
      return;
    }

    setIsSavingVoucher(true);
    setError(null);

    try {
      const input = voucherInputFromForm(voucherForm);
      if (editingVoucherId === null) {
        await onCreateVoucher(input);
      } else {
        await onUpdateVoucher(editingVoucherId, input);
      }
      closeVoucherModal();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSavingVoucher(false);
    }
  };

  const handleDeletePromotion = async (promotion: Promotion) => {
    if (!canDeleteOffers) {
      setError(mutationUnavailableMessage(demoMode, "delete promotions"));
      return;
    }

    if (!window.confirm(`Delete promotion \"${promotion.title}\"?`)) {
      return;
    }

    setDeletingPromotionId(promotion.id);
    setError(null);

    try {
      await onDeletePromotion(promotion.id);
      if (editingPromotionId === promotion.id) {
        closePromotionModal();
      }
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingPromotionId(null);
    }
  };

  const handleDeleteVoucher = async (voucher: Voucher) => {
    if (!canDeleteOffers) {
      setError(mutationUnavailableMessage(demoMode, "delete vouchers"));
      return;
    }

    if (!window.confirm(`Delete voucher \"${voucher.code}\"?`)) {
      return;
    }

    setDeletingVoucherId(voucher.id);
    setError(null);

    try {
      await onDeleteVoucher(voucher.id);
      if (editingVoucherId === voucher.id) {
        closeVoucherModal();
      }
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const promotionColumns = [
    {
      key: "id",
      label: "ID",
      align: "right" as const,
      sortValue: (promotion: Promotion) => promotion.id,
      render: (promotion: Promotion) => `#${promotion.id}`
    },
    {
      key: "promotion",
      label: "Promotion",
      sortValue: (promotion: Promotion) => promotion.title,
      render: (promotion: Promotion) => (
        <div className="table-cell-main">
          <strong>{promotion.title}</strong>
          <span>{promotion.label}</span>
          <span>{promotion.description}</span>
        </div>
      )
    },
    {
      key: "discount",
      label: "Discount",
      sortValue: (promotion: Promotion) => promotion.discount_value,
      render: (promotion: Promotion) => (
        <div className="table-cell-main">
          <strong>{discountSummary(promotion.discount_type, promotion.discount_value)}</strong>
          <span>
            {promotion.minimum_subtotal_cents > 0
              ? `Minimum ${currencyFromCents(promotion.minimum_subtotal_cents)}`
              : "No minimum"}
          </span>
        </div>
      )
    },
    {
      key: "validity",
      label: "Validity / status",
      sortValue: (promotion: Promotion) => promotion.ends_at ?? promotion.starts_at ?? "",
      render: (promotion: Promotion) => (
        <div className="table-cell-main">
          <span className={`status-pill ${promotion.is_active ? "live" : ""}`}>
            {promotion.is_active ? "Active" : "Inactive"}
          </span>
          <span>{validitySummary(promotion.starts_at, promotion.ends_at)}</span>
        </div>
      )
    },
    {
      key: "redemptions",
      label: "Redemptions",
      align: "right" as const,
      sortValue: (promotion: Promotion) => promotion.redemption_count,
      render: (promotion: Promotion) => redemptionSummary(promotion.redemption_count, promotion.max_redemptions)
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (promotion: Promotion) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdateOffers}
            onClick={() => openEditPromotion(promotion)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button table-action danger-button"
            disabled={!canDeleteOffers || deletingPromotionId === promotion.id}
            onClick={() => void handleDeletePromotion(promotion)}
            type="button"
          >
            {deletingPromotionId === promotion.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  const voucherColumns = [
    {
      key: "id",
      label: "ID",
      align: "right" as const,
      sortValue: (voucher: Voucher) => voucher.id,
      render: (voucher: Voucher) => `#${voucher.id}`
    },
    {
      key: "voucher",
      label: "Voucher",
      sortValue: (voucher: Voucher) => voucher.code,
      render: (voucher: Voucher) => (
        <div className="table-cell-main">
          <strong>{voucher.code}</strong>
          <span>{voucher.title}</span>
          <span>{voucher.description}</span>
        </div>
      )
    },
    {
      key: "discount",
      label: "Discount",
      sortValue: (voucher: Voucher) => voucher.discount_value,
      render: (voucher: Voucher) => (
        <div className="table-cell-main">
          <strong>{discountSummary(voucher.discount_type, voucher.discount_value)}</strong>
          <span>
            {voucher.minimum_subtotal_cents > 0
              ? `Minimum ${currencyFromCents(voucher.minimum_subtotal_cents)}`
              : "No minimum"}
          </span>
        </div>
      )
    },
    {
      key: "validity",
      label: "Validity / status",
      sortValue: (voucher: Voucher) => voucher.ends_at ?? voucher.starts_at ?? "",
      render: (voucher: Voucher) => (
        <div className="table-cell-main">
          <span className={`status-pill ${voucher.is_active ? "live" : ""}`}>
            {voucher.is_active ? "Active" : "Inactive"}
          </span>
          <span>{validitySummary(voucher.starts_at, voucher.ends_at)}</span>
          <span>{voucher.is_public ? "Public" : "Private"}</span>
        </div>
      )
    },
    {
      key: "redemptions",
      label: "Redemptions",
      align: "right" as const,
      sortValue: (voucher: Voucher) => voucher.redemption_count,
      render: (voucher: Voucher) => redemptionSummary(voucher.redemption_count, voucher.max_redemptions)
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (voucher: Voucher) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdateOffers}
            onClick={() => openEditVoucher(voucher)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button table-action danger-button"
            disabled={!canDeleteOffers || deletingVoucherId === voucher.id}
            onClick={() => void handleDeleteVoucher(voucher)}
            type="button"
          >
            {deletingVoucherId === voucher.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Offers</p>
          <h3>Manage promotions and vouchers</h3>
        </div>
        <span className={`status-pill ${isWritable ? "live" : ""}`}>
          {demoMode ? "Demo mode" : isWritable ? "Writable" : "Read only"}
        </span>
      </div>

      <InlineError message={error} />

      <div className="admin-panels two-up">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Promotions</p>
              <h3>Storefront deal cards</h3>
            </div>
            <button
              className="solid-button"
              disabled={!canCreateOffers}
              onClick={openCreatePromotion}
              type="button"
            >
              Create Promotion
            </button>
          </div>
          <ManagementTable
            columns={promotionColumns}
            emptyMessage="No promotions have been created yet."
            getRowKey={(promotion) => promotion.id}
            initialSortKey="promotion"
            rows={promotions}
            tableLabel="Promotion management table"
          />
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Vouchers</p>
              <h3>Guest redemption codes</h3>
            </div>
            <button
              className="solid-button"
              disabled={!canCreateOffers}
              onClick={openCreateVoucher}
              type="button"
            >
              Create Voucher
            </button>
          </div>
          <ManagementTable
            columns={voucherColumns}
            emptyMessage="No vouchers have been created yet."
            getRowKey={(voucher) => voucher.id}
            initialSortKey="voucher"
            rows={vouchers}
            tableLabel="Voucher management table"
          />
        </article>
      </div>

      <RecordModal
        eyebrow={editingPromotionId === null ? "New promotion" : `Promotion #${editingPromotionId}`}
        isOpen={isPromotionModalOpen}
        onClose={closePromotionModal}
        size="wide"
        statusLabel={promotionCanSave ? "Writable" : "Read only"}
        statusTone={promotionCanSave ? "live" : undefined}
        title={editingPromotion?.title ?? "Create a promotion"}
      >
        <RecordForm
          disabled={!promotionCanSave}
          feedback={<InlineError message={error} />}
          fields={promotionFields}
          isSubmitting={isSavingPromotion}
          onCancel={closePromotionModal}
          onChange={setPromotionForm}
          onSubmit={() => handleSavePromotion()}
          submitLabel={editingPromotionId === null ? "Create Promotion" : "Save Promotion"}
          validate={validatePromotionForm}
          values={promotionForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow={editingVoucherId === null ? "New voucher" : `Voucher #${editingVoucherId}`}
        isOpen={isVoucherModalOpen}
        onClose={closeVoucherModal}
        size="wide"
        statusLabel={voucherCanSave ? "Writable" : "Read only"}
        statusTone={voucherCanSave ? "live" : undefined}
        title={editingVoucher?.code ?? "Create a voucher"}
      >
        <RecordForm
          disabled={!voucherCanSave}
          feedback={<InlineError message={error} />}
          fields={voucherFields}
          isSubmitting={isSavingVoucher}
          onCancel={closeVoucherModal}
          onChange={setVoucherForm}
          onSubmit={() => handleSaveVoucher()}
          submitLabel={editingVoucherId === null ? "Create Voucher" : "Save Voucher"}
          validate={validateVoucherForm}
          values={voucherForm}
        />
      </RecordModal>
    </section>
  );
}
