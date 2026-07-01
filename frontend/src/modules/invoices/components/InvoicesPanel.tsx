import { type FormEvent, useState } from "react";

import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import type { Order } from "../../orders/types";
import type { SystemSetting } from "../../settings/types";
import type {
  CreateInvoiceFromOrderInput,
  Invoice,
  InvoiceStatus,
  RecordInvoicePaymentInput,
  UpdateInvoiceBillingInput
} from "../types";

const paymentMethods = ["Card", "Cash", "ACH", "Check", "Store Credit"];

type InvoicesPanelProps = {
  canCreate: boolean;
  canUpdate: boolean;
  invoices: Invoice[];
  onCreateInvoiceFromOrder: (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ) => Promise<Invoice>;
  onRecordInvoicePayment: (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ) => Promise<Invoice>;
  onUpdateInvoiceBilling: (invoiceId: number, input: UpdateInvoiceBillingInput) => Promise<Invoice>;
  onVoidInvoice: (invoiceId: number) => Promise<Invoice>;
  orders: Order[];
  settings: SystemSetting[];
};

function settingValue(settings: SystemSetting[], key: string, fallback: string): string {
  return settings.find((setting) => setting.key === key)?.value ?? fallback;
}

function statusPillClass(status: InvoiceStatus): string {
  if (status === "paid") {
    return "live";
  }

  if (status === "overdue" || status === "void") {
    return "danger";
  }

  if (status === "partial") {
    return "warning";
  }

  return "";
}

export function InvoicesPanel({
  canCreate,
  canUpdate,
  invoices,
  onCreateInvoiceFromOrder,
  onRecordInvoicePayment,
  onUpdateInvoiceBilling,
  onVoidInvoice,
  orders,
  settings
}: InvoicesPanelProps) {
  const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.order_id));
  const uninvoicedOrders = orders.filter((order) => !invoicedOrderIds.has(order.id));

  const [newInvoiceOrderId, setNewInvoiceOrderId] = useState(
    uninvoicedOrders[0] ? String(uninvoicedOrders[0].id) : ""
  );
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState("0.00");
  const [billingDrafts, setBillingDrafts] = useState<Record<number, string>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<
    Record<number, { amount: string; method: string; note: string }>
  >({});
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const companyName = settingValue(settings, "general.company_name", "Project Depot");
  const companyAddress = settingValue(settings, "general.company_address", "");

  const billingDraftFor = (invoice: Invoice) => billingDrafts[invoice.id] ?? invoice.billing_address;
  const paymentDraftFor = (invoice: Invoice) =>
    paymentDrafts[invoice.id] ?? {
      amount: ((invoice.total_cents - invoice.amount_paid_cents) / 100).toFixed(2),
      method: paymentMethods[0],
      note: ""
    };

  const handleCreateInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreate) {
      setFeedback({ kind: "error", message: "The active role cannot create invoices." });
      return;
    }

    const orderId = Number(newInvoiceOrderId);
    const discountCents = Math.round(Number(newInvoiceDiscount) * 100);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      setFeedback({ kind: "error", message: "Select an order to invoice." });
      return;
    }

    setFeedback(null);
    setIsCreating(true);

    try {
      const invoice = await onCreateInvoiceFromOrder(orderId, {
        discount_cents: Number.isFinite(discountCents) && discountCents > 0 ? discountCents : undefined
      });
      setNewInvoiceDiscount("0.00");
      setFeedback({ kind: "success", message: `Invoice ${invoice.invoice_number} was created.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create invoice."
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveBilling = async (event: FormEvent<HTMLFormElement>, invoice: Invoice) => {
    event.preventDefault();

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot update billing details." });
      return;
    }

    setFeedback(null);
    setBusyInvoiceId(invoice.id);

    try {
      const updated = await onUpdateInvoiceBilling(invoice.id, {
        billing_address: billingDraftFor(invoice).trim()
      });
      setBillingDrafts((current) => ({ ...current, [updated.id]: updated.billing_address }));
      setFeedback({ kind: "success", message: `Billing address updated for ${updated.invoice_number}.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update billing address."
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleRecordPayment = async (event: FormEvent<HTMLFormElement>, invoice: Invoice) => {
    event.preventDefault();

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot record invoice payments." });
      return;
    }

    const draft = paymentDraftFor(invoice);
    const amountCents = Math.round(Number(draft.amount) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setFeedback({ kind: "error", message: "Enter a payment amount above zero." });
      return;
    }

    setFeedback(null);
    setBusyInvoiceId(invoice.id);

    try {
      const updated = await onRecordInvoicePayment(invoice.id, {
        amount_cents: amountCents,
        method: draft.method,
        note: draft.note.trim()
      });
      setPaymentDrafts((current) => {
        const next = { ...current };
        delete next[updated.id];
        return next;
      });
      setFeedback({ kind: "success", message: `Payment recorded for ${updated.invoice_number}.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to record payment."
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot void invoices." });
      return;
    }

    const confirmed = window.confirm(`Void invoice ${invoice.invoice_number}?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setBusyInvoiceId(invoice.id);

    try {
      const updated = await onVoidInvoice(invoice.id);
      setFeedback({ kind: "success", message: `${updated.invoice_number} was voided.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to void invoice."
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handlePrint = (invoice: Invoice) => {
    setPrintingInvoice(invoice);
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Invoicing</p>
          <h3>Generate and manage invoices</h3>
        </div>
        <span className="status-pill">{invoices.length} invoices</span>
      </div>

      {feedback ? (
        <p className={`catalog-feedback no-print ${feedback.kind}`}>{feedback.message}</p>
      ) : null}

      <article className="dashboard-panel no-print">
        <div className="panel-header">
          <div>
            <p className="eyebrow">New invoice</p>
            <h3>Create from an order</h3>
          </div>
          <span className={`status-pill ${canCreate ? "live" : ""}`}>
            {canCreate ? "Writable" : "Read only"}
          </span>
        </div>

        {uninvoicedOrders.length === 0 ? (
          <p>Every order already has an invoice.</p>
        ) : (
          <form className="admin-form-grid sales-inline-form" onSubmit={(event) => void handleCreateInvoice(event)}>
            <label className="admin-field">
              Order
              <select
                disabled={!canCreate}
                onChange={(event) => setNewInvoiceOrderId(event.target.value)}
                value={newInvoiceOrderId}
              >
                {uninvoicedOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} {order.customer_name} - {currencyFromCents(order.subtotal_cents)}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Discount
              <input
                disabled={!canCreate}
                min="0"
                onChange={(event) => setNewInvoiceDiscount(event.target.value)}
                step="0.01"
                type="number"
                value={newInvoiceDiscount}
              />
            </label>
            <button className="solid-button" disabled={!canCreate || isCreating} type="submit">
              {isCreating ? "Creating..." : "Create invoice"}
            </button>
          </form>
        )}
      </article>

      {invoices.length === 0 ? (
        <p className="no-print">No invoices have been created yet.</p>
      ) : (
        <div className="invoices-list no-print">
          {invoices.map((invoice) => {
            const remainingCents = invoice.total_cents - invoice.amount_paid_cents;
            const paymentDraft = paymentDraftFor(invoice);
            const isBusy = busyInvoiceId === invoice.id;
            const canVoid = invoice.status !== "void" && invoice.amount_paid_cents === 0;
            const canRecordPayment = invoice.status !== "void" && remainingCents > 0;

            return (
              <article className="dashboard-panel" key={invoice.id}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">{invoice.invoice_number}</p>
                    <h4>{invoice.billing_name}</h4>
                    <span>
                      Order #{invoice.order_id} &middot; {invoice.billing_email}
                    </span>
                  </div>
                  <span className={`status-pill ${statusPillClass(invoice.status)}`}>{invoice.status}</span>
                </div>

                <div className="sales-detail-grid">
                  <div>
                    <span>Subtotal</span>
                    <strong>{currencyFromCents(invoice.subtotal_cents)}</strong>
                  </div>
                  <div>
                    <span>Discount</span>
                    <strong>{currencyFromCents(invoice.discount_cents)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{currencyFromCents(invoice.tax_cents)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{currencyFromCents(invoice.total_cents)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong>{currencyFromCents(invoice.amount_paid_cents)}</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{currencyFromCents(Math.max(remainingCents, 0))}</strong>
                  </div>
                  <div>
                    <span>Issued</span>
                    <strong>{formatOrderDate(invoice.issued_at)}</strong>
                  </div>
                  <div>
                    <span>Due</span>
                    <strong>{formatOrderDate(invoice.due_at)}</strong>
                  </div>
                </div>

                <form
                  className="admin-form-grid sales-inline-form"
                  onSubmit={(event) => void handleSaveBilling(event, invoice)}
                >
                  <label className="admin-field">
                    Billing address
                    <input
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setBillingDrafts((current) => ({ ...current, [invoice.id]: event.target.value }))
                      }
                      value={billingDraftFor(invoice)}
                    />
                  </label>
                  <button className="outline-button" disabled={!canUpdate || isBusy} type="submit">
                    Save address
                  </button>
                </form>

                {canRecordPayment ? (
                  <form
                    className="admin-form-grid sales-inline-form"
                    onSubmit={(event) => void handleRecordPayment(event, invoice)}
                  >
                    <label className="admin-field">
                      Amount
                      <input
                        disabled={!canUpdate}
                        min="0.01"
                        onChange={(event) =>
                          setPaymentDrafts((current) => ({
                            ...current,
                            [invoice.id]: { ...paymentDraft, amount: event.target.value }
                          }))
                        }
                        step="0.01"
                        type="number"
                        value={paymentDraft.amount}
                      />
                    </label>
                    <label className="admin-field">
                      Method
                      <select
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setPaymentDrafts((current) => ({
                            ...current,
                            [invoice.id]: { ...paymentDraft, method: event.target.value }
                          }))
                        }
                        value={paymentDraft.method}
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      Note
                      <input
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setPaymentDrafts((current) => ({
                            ...current,
                            [invoice.id]: { ...paymentDraft, note: event.target.value }
                          }))
                        }
                        placeholder="Optional"
                        value={paymentDraft.note}
                      />
                    </label>
                    <button className="solid-button" disabled={!canUpdate || isBusy} type="submit">
                      {isBusy ? "Saving..." : "Record payment"}
                    </button>
                  </form>
                ) : null}

                <div className="order-actions">
                  <button className="outline-button" onClick={() => handlePrint(invoice)} type="button">
                    Print
                  </button>
                  {canVoid ? (
                    <button
                      className="outline-button danger-button"
                      disabled={!canUpdate || isBusy}
                      onClick={() => void handleVoidInvoice(invoice)}
                      type="button"
                    >
                      Void
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {printingInvoice ? (
        <div className="invoice-print-view">
          <div className="invoice-print-header">
            <div>
              <h2>{companyName}</h2>
              <p>{companyAddress}</p>
            </div>
            <div className="invoice-print-meta">
              <h3>Invoice {printingInvoice.invoice_number}</h3>
              <p>Issued {formatOrderDate(printingInvoice.issued_at)}</p>
              <p>Due {formatOrderDate(printingInvoice.due_at)}</p>
              <p>Status: {printingInvoice.status}</p>
            </div>
          </div>

          <div className="invoice-print-billing">
            <strong>Bill to</strong>
            <p>{printingInvoice.billing_name}</p>
            <p>{printingInvoice.billing_email}</p>
            {printingInvoice.billing_address ? <p>{printingInvoice.billing_address}</p> : null}
          </div>

          <table className="invoice-print-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {printingInvoice.line_items.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>{currencyFromCents(item.unit_price_cents)}</td>
                  <td>{currencyFromCents(item.unit_price_cents * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-print-totals">
            <div>
              <span>Subtotal</span>
              <strong>{currencyFromCents(printingInvoice.subtotal_cents)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{currencyFromCents(printingInvoice.discount_cents)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{currencyFromCents(printingInvoice.tax_cents)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{currencyFromCents(printingInvoice.total_cents)}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{currencyFromCents(printingInvoice.amount_paid_cents)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
