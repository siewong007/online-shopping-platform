import { type FormEvent, useMemo, useState } from "react";

import { ManagementTable } from "../../../shared/components/ManagementTable";
import { RecordModal } from "../../../shared/components/RecordModal";
import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import type { Order } from "../../orders/types";
import type { CreatePaymentInput, Payment, PaymentStatus, UpdatePaymentInput } from "../types";

const paymentStatuses: PaymentStatus[] = ["Pending", "Captured", "Refunded", "Failed", "Void"];
const paymentMethods = ["Card", "Cash", "ACH", "Gift Card", "Store Credit"];

type PaymentFormState = {
  order_id: string;
  amount: string;
  method: string;
  status: PaymentStatus;
  reference: string;
  notes: string;
  idempotency_key: string;
};

type PaymentManagementPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  onCreatePayment: (input: CreatePaymentInput) => Promise<Payment>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onUpdatePayment: (paymentId: number, input: UpdatePaymentInput) => Promise<Payment>;
  orders: Order[];
  payments: Payment[];
};

function generateIdempotencyKey(orderId?: string): string {
  const orderPart = orderId && orderId.length > 0 ? orderId : "new";
  return `pay-${orderPart}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function paymentStatusClass(status: PaymentStatus): string {
  if (status === "Captured") {
    return "live";
  }

  if (status === "Pending") {
    return "warning";
  }

  return "";
}

function capturedTotalForOrder(payments: Payment[], orderId: number, excludedPaymentId?: number): number {
  return payments
    .filter(
      (payment) =>
        payment.order_id === orderId &&
        payment.status === "Captured" &&
        payment.id !== excludedPaymentId
    )
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
}

function emptyPaymentForm(orders: Order[], payments: Payment[]): PaymentFormState {
  const order = orders[0] ?? null;
  const capturedTotal = order ? capturedTotalForOrder(payments, order.id) : 0;
  const remainingCents = order ? Math.max(order.subtotal_cents - capturedTotal, 0) : 0;
  const orderId = order ? String(order.id) : "";

  return {
    order_id: orderId,
    amount: (remainingCents / 100).toFixed(2),
    method: paymentMethods[0],
    status: "Captured",
    reference: "",
    notes: "",
    idempotency_key: generateIdempotencyKey(orderId)
  };
}

function paymentToForm(payment: Payment): PaymentFormState {
  return {
    order_id: String(payment.order_id),
    amount: (payment.amount_cents / 100).toFixed(2),
    method: payment.method,
    status: payment.status,
    reference: payment.reference,
    notes: payment.notes,
    idempotency_key: payment.idempotency_key
  };
}

function normalizeCreatePaymentForm(form: PaymentFormState): CreatePaymentInput {
  const orderId = Number(form.order_id);
  const amountCents = Math.round(Number(form.amount) * 100);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error("Select an order.");
  }

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Enter a payment amount above zero.");
  }

  return {
    order_id: orderId,
    amount_cents: amountCents,
    method: form.method.trim(),
    status: form.status,
    reference: form.reference.trim(),
    notes: form.notes.trim(),
    idempotency_key: form.idempotency_key.trim()
  };
}

function normalizeUpdatePaymentForm(form: PaymentFormState): UpdatePaymentInput {
  const { amount_cents, method, status, reference, notes } = normalizeCreatePaymentForm(form);
  return { amount_cents, method, status, reference, notes };
}

export function PaymentManagementPanel({
  canCreate,
  canDelete,
  canUpdate,
  onCreatePayment,
  onDeletePayment,
  onUpdatePayment,
  orders,
  payments
}: PaymentManagementPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [form, setForm] = useState<PaymentFormState>(() => emptyPaymentForm(orders, payments));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const canSave = editingPaymentId === null ? canCreate : canUpdate;
  const selectedOrder = orders.find((order) => order.id === Number(form.order_id)) ?? null;
  const capturedTotal = selectedOrder
    ? capturedTotalForOrder(payments, selectedOrder.id, editingPaymentId ?? undefined)
    : 0;
  const previewAmountCents = Math.round(Number(form.amount) * 100);
  const previewCapturedTotal =
    selectedOrder && form.status === "Captured" && Number.isFinite(previewAmountCents)
      ? capturedTotal + previewAmountCents
      : capturedTotal;
  const previewRemaining = selectedOrder
    ? Math.max(selectedOrder.subtotal_cents - previewCapturedTotal, 0)
    : 0;

  const paymentTotals = useMemo(() => {
    const captured = payments
      .filter((payment) => payment.status === "Captured")
      .reduce((sum, payment) => sum + payment.amount_cents, 0);
    const pending = payments
      .filter((payment) => payment.status === "Pending")
      .reduce((sum, payment) => sum + payment.amount_cents, 0);

    return { captured, pending };
  }, [payments]);

  const resetForm = () => {
    setEditingPaymentId(null);
    setForm(emptyPaymentForm(orders, payments));
    setIsEditorOpen(false);
  };

  const selectOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === Number(orderId)) ?? null;
    const capturedForOrder = order ? capturedTotalForOrder(payments, order.id) : 0;
    const remainingCents = order ? Math.max(order.subtotal_cents - capturedForOrder, 0) : 0;

    setForm((current) => ({
      ...current,
      order_id: orderId,
      amount: (remainingCents / 100).toFixed(2),
      idempotency_key: generateIdempotencyKey(orderId)
    }));
  };

  const editPayment = (payment: Payment) => {
    setEditingPaymentId(payment.id);
    setForm(paymentToForm(payment));
    setIsEditorOpen(true);
  };

  const createPayment = () => {
    setEditingPaymentId(null);
    setForm(emptyPaymentForm(orders, payments));
    setIsEditorOpen(true);
  };

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      notify({ severity: "error", title: "Payment not saved", message: "The active role cannot save this payment change.", scope: "payments", dedupeKey: "payments:save:permission" });
      return;
    }

    const wasCreating = editingPaymentId === null;
    setIsSaving(true);

    try {
      const payment =
        editingPaymentId === null
          ? await onCreatePayment(normalizeCreatePaymentForm(form))
          : await onUpdatePayment(editingPaymentId, normalizeUpdatePaymentForm(form));

      if (editingPaymentId === null) {
        setForm(emptyPaymentForm(orders, [payment, ...payments]));
      } else {
        setForm(paymentToForm(payment));
      }

      setIsEditorOpen(false);
      setEditingPaymentId(null);
      notify({ severity: "success", title: wasCreating ? "Payment recorded" : "Payment updated", message: `Payment #${payment.id} was ${wasCreating ? "recorded" : "updated"} successfully.`, scope: "payments", dedupeKey: `payments:${payment.id}:${wasCreating ? "create" : "update"}:success` });
    } catch (error) {
      notifyError(error, { operation: wasCreating ? "record payment" : "update payment", scope: "payments", dedupeKey: `payments:${editingPaymentId ?? "new"}:save:error` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (!canDelete) {
      notify({ severity: "error", title: "Payment not deleted", message: "The active role cannot delete payments.", scope: "payments", dedupeKey: "payments:delete:permission" });
      return;
    }

    const confirmed = window.confirm(`Delete payment #${payment.id}?`);
    if (!confirmed) {
      return;
    }

    setDeletingPaymentId(payment.id);

    try {
      await onDeletePayment(payment.id);
      if (editingPaymentId === payment.id) {
        resetForm();
      }
      notify({ severity: "success", title: "Payment deleted", message: `Payment #${payment.id} was deleted successfully.`, scope: "payments", dedupeKey: `payments:${payment.id}:delete:success` });
    } catch (error) {
      notifyError(error, { operation: "delete payment", scope: "payments", dedupeKey: `payments:${payment.id}:delete:error` });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const paymentColumns = [
    {
      key: "id",
      label: "Payment",
      align: "right" as const,
      sortValue: (payment: Payment) => payment.id,
      render: (payment: Payment) => `#${payment.id}`
    },
    {
      key: "order",
      label: "Order",
      align: "right" as const,
      sortValue: (payment: Payment) => payment.order_id,
      render: (payment: Payment) => `#${payment.order_id}`
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (payment: Payment) => payment.order_customer_name,
      render: (payment: Payment) => (
        <div className="table-cell-main">
          <strong>{payment.order_customer_name}</strong>
          <span>{payment.order_customer_email}</span>
        </div>
      )
    },
    {
      key: "method",
      label: "Tender",
      sortValue: (payment: Payment) => payment.method,
      render: (payment: Payment) => payment.method
    },
    {
      key: "status",
      label: "Status",
      sortValue: (payment: Payment) => payment.status,
      render: (payment: Payment) => (
        <span className={`status-pill ${paymentStatusClass(payment.status)}`}>
          {payment.status}
        </span>
      )
    },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      sortValue: (payment: Payment) => payment.amount_cents,
      render: (payment: Payment) => currencyFromCents(payment.amount_cents)
    },
    {
      key: "remaining",
      label: "Remaining",
      align: "right" as const,
      sortValue: (payment: Payment) =>
        Math.max(
          payment.order_subtotal_cents - capturedTotalForOrder(payments, payment.order_id),
          0
        ),
      render: (payment: Payment) =>
        currencyFromCents(
          Math.max(
            payment.order_subtotal_cents - capturedTotalForOrder(payments, payment.order_id),
            0
          )
        )
    },
    {
      key: "reference",
      label: "Reference",
      sortValue: (payment: Payment) => payment.reference,
      render: (payment: Payment) => payment.reference || "None"
    },
    {
      key: "idempotency",
      label: "Key",
      sortValue: (payment: Payment) => payment.idempotency_key,
      render: (payment: Payment) => <span className="table-muted">{payment.idempotency_key}</span>
    },
    {
      key: "notes",
      label: "Notes",
      sortValue: (payment: Payment) => payment.notes,
      render: (payment: Payment) => payment.notes || "None"
    },
    {
      key: "updated",
      label: "Updated",
      sortValue: (payment: Payment) => payment.updated_at,
      render: (payment: Payment) => formatOrderDate(payment.updated_at)
    },
    {
      key: "actions",
      label: "Actions",
      render: (payment: Payment) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => editPayment(payment)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button danger-button table-action"
            disabled={!canDelete || deletingPaymentId === payment.id}
            onClick={() => void handleDeletePayment(payment)}
            type="button"
          >
            {deletingPaymentId === payment.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Payment control</p>
          <h3>Manage payment details</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
          {payments.length} rows
        </span>
      </div>

      <div className="metric-grid payment-summary-grid">
        <article className="metric-card">
          <p>Captured</p>
          <strong>{currencyFromCents(paymentTotals.captured)}</strong>
          <span>{payments.filter((payment) => payment.status === "Captured").length} transactions</span>
        </article>
        <article className="metric-card">
          <p>Pending</p>
          <strong>{currencyFromCents(paymentTotals.pending)}</strong>
          <span>{payments.filter((payment) => payment.status === "Pending").length} transactions</span>
        </article>
        <article className="metric-card">
          <p>Orders</p>
          <strong>{orders.length}</strong>
          <span>Available for payment matching</span>
        </article>
      </div>

      <article className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Payment ledger</p>
            <h3>Recent tenders</h3>
          </div>
          <div className="admin-actions">
            <span className="status-pill">{payments.length} rows</span>
            <button className="solid-button" disabled={!canCreate} onClick={createPayment} type="button">
              Record Payment
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <p>No payments have been recorded yet.</p>
        ) : (
          <ManagementTable
            columns={paymentColumns}
            emptyMessage="No payments have been recorded yet."
            getRowKey={(payment) => payment.id}
            initialSortDirection="desc"
            initialSortKey="updated"
            rows={payments}
            tableLabel="Tender and payment management table"
          />
        )}
      </article>

      <RecordModal
        eyebrow={editingPaymentId === null ? "New payment" : `Payment #${editingPaymentId}`}
        isOpen={isEditorOpen}
        onClose={resetForm}
        size="wide"
        statusLabel={canSave ? "Writable" : "Read only"}
        statusTone={canSave ? "live" : undefined}
        title={editingPaymentId === null ? "Record tender" : "Modify tender"}
      >
        <form className="admin-form" onSubmit={handleSubmitPayment}>
          <label className="admin-field">
            Order
            <select
              disabled={!canSave || editingPaymentId !== null}
              value={form.order_id}
              onChange={(event) => selectOrder(event.target.value)}
              required
            >
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  #{order.id} {order.customer_name} - {currencyFromCents(order.subtotal_cents)}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-form-grid">
            <label className="admin-field">
              Amount
              <input
                disabled={!canSave}
                min="0.01"
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                required
              />
            </label>

            <label className="admin-field">
              Status
              <select
                disabled={!canSave}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as PaymentStatus
                  }))
                }
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              Method
              <select
                disabled={!canSave}
                value={form.method}
                onChange={(event) =>
                  setForm((current) => ({ ...current, method: event.target.value }))
                }
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              Reference
              <input
                disabled={!canSave}
                value={form.reference}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reference: event.target.value }))
                }
                placeholder="ch_123 or receipt number"
              />
            </label>
          </div>

          <label className="admin-field">
            Idempotency key
            <input
              disabled={!canSave || editingPaymentId !== null}
              value={form.idempotency_key}
              onChange={(event) =>
                setForm((current) => ({ ...current, idempotency_key: event.target.value }))
              }
              required
            />
          </label>

          <label className="admin-field">
            Notes
            <textarea
              disabled={!canSave}
              rows={4}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>

          {selectedOrder ? (
            <div className="payment-balance-card">
              <div>
                <span>Order subtotal</span>
                <strong>{currencyFromCents(selectedOrder.subtotal_cents)}</strong>
              </div>
              <div>
                <span>Captured after save</span>
                <strong>{currencyFromCents(previewCapturedTotal)}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{currencyFromCents(previewRemaining)}</strong>
              </div>
            </div>
          ) : null}

          <div className="form-actions split-actions">
            <button className="solid-button" disabled={!canSave || isSaving} type="submit">
              {isSaving
                ? "Saving..."
                : editingPaymentId === null
                  ? "Record Payment"
                  : "Save Payment"}
            </button>
            <button className="outline-button" disabled={isSaving} onClick={resetForm} type="button">
              Cancel
            </button>
          </div>
        </form>
      </RecordModal>
    </section>
  );
}
