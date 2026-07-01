import { type FormEvent, useMemo, useState } from "react";

import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
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
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [form, setForm] = useState<PaymentFormState>(() => emptyPaymentForm(orders, payments));
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
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
    setFeedback(null);
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
    setFeedback(null);
  };

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      setFeedback({ kind: "error", message: "The active role cannot save this payment change." });
      return;
    }

    setFeedback(null);
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

      setFeedback({
        kind: "success",
        message:
          editingPaymentId === null
            ? `Payment #${payment.id} was recorded.`
            : `Payment #${payment.id} was updated.`
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to save payment."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (!canDelete) {
      setFeedback({ kind: "error", message: "The active role cannot delete payments." });
      return;
    }

    const confirmed = window.confirm(`Delete payment #${payment.id}?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setDeletingPaymentId(payment.id);

    try {
      await onDeletePayment(payment.id);
      if (editingPaymentId === payment.id) {
        resetForm();
      }
      setFeedback({ kind: "success", message: `Payment #${payment.id} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete payment."
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

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

      <div className="payment-management-grid">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                {editingPaymentId === null ? "New payment" : `Payment #${editingPaymentId}`}
              </p>
              <h3>{editingPaymentId === null ? "Record tender" : "Modify tender"}</h3>
            </div>
            <span className={`status-pill ${canSave ? "live" : ""}`}>
              {canSave ? "Writable" : "Read only"}
            </span>
          </div>

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

            {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}

            <div className="form-actions split-actions">
              <button className="solid-button" disabled={!canSave || isSaving} type="submit">
                {isSaving
                  ? "Saving..."
                  : editingPaymentId === null
                    ? "Record Payment"
                    : "Save Payment"}
              </button>
              <button className="outline-button" onClick={resetForm} type="button">
                Clear
              </button>
            </div>
          </form>
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payment ledger</p>
              <h3>Recent tenders</h3>
            </div>
            <span className="status-pill">{payments.length} rows</span>
          </div>

          {payments.length === 0 ? (
            <p>No payments have been recorded yet.</p>
          ) : (
            <div className="payment-list">
              {payments.map((payment) => {
                const orderCaptured = capturedTotalForOrder(payments, payment.order_id);
                const orderRemaining = Math.max(
                  payment.order_subtotal_cents - orderCaptured,
                  0
                );

                return (
                  <div className="payment-row" key={payment.id}>
                    <div className="payment-row-top">
                      <div>
                        <p className="eyebrow">Payment #{payment.id}</p>
                        <h4>{payment.order_customer_name}</h4>
                        <span>
                          Order #{payment.order_id} &middot; {payment.order_customer_email}
                        </span>
                      </div>
                      <div className="payment-amount-block">
                        <strong>{currencyFromCents(payment.amount_cents)}</strong>
                        <span className={`status-pill ${paymentStatusClass(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>

                    <div className="payment-detail-grid">
                      <div>
                        <span>Method</span>
                        <strong>{payment.method}</strong>
                      </div>
                      <div>
                        <span>Reference</span>
                        <strong>{payment.reference || "None"}</strong>
                      </div>
                      <div>
                        <span>Remaining</span>
                        <strong>{currencyFromCents(orderRemaining)}</strong>
                      </div>
                      <div>
                        <span>Updated</span>
                        <strong>{formatOrderDate(payment.updated_at)}</strong>
                      </div>
                    </div>

                    <div className="payment-key-row">
                      <span>{payment.idempotency_key}</span>
                    </div>

                    {payment.notes ? <p className="payment-note">{payment.notes}</p> : null}

                    <div className="order-actions">
                      <button
                        className="outline-button"
                        disabled={!canUpdate}
                        onClick={() => editPayment(payment)}
                      >
                        Edit
                      </button>
                      <button
                        className="outline-button danger-button"
                        disabled={!canDelete || deletingPaymentId === payment.id}
                        onClick={() => void handleDeletePayment(payment)}
                      >
                        {deletingPaymentId === payment.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
