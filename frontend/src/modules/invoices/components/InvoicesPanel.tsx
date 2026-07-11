import { type FormEvent, useState } from "react";

import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import type { Order } from "../../orders/types";
import type { SystemSetting } from "../../settings/types";
import type {
  AutoCountExportInput,
  CreateInvoiceFromOrderInput,
  Invoice,
  InvoiceStatus,
  RecordInvoicePaymentInput,
  UpdateInvoiceBillingInput
} from "../types";

const paymentMethods = ["Card", "Cash", "ACH", "Check", "Store Credit"];

type BillingDraft = {
  billing_address: string;
  buyer_tin: string;
  buyer_registration_number: string;
  buyer_sst_registration_number: string;
};

type InvoicesPanelProps = {
  canCreate: boolean;
  canUpdate: boolean;
  hasMore: boolean;
  invoices: Invoice[];
  isLoadingMore: boolean;
  onCreateInvoiceFromOrder: (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ) => Promise<Invoice>;
  onExportAutoCountInvoices: (input: AutoCountExportInput) => Promise<void>;
  onLoadMore: () => void;
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
  hasMore,
  invoices,
  isLoadingMore,
  onCreateInvoiceFromOrder,
  onExportAutoCountInvoices,
  onLoadMore,
  onRecordInvoicePayment,
  onUpdateInvoiceBilling,
  onVoidInvoice,
  orders,
  settings
}: InvoicesPanelProps) {
  const { notify, notifyError } = useNotifications();
  const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.order_id));
  const uninvoicedOrders = orders.filter((order) => !invoicedOrderIds.has(order.id));

  const [newInvoiceOrderId, setNewInvoiceOrderId] = useState(
    uninvoicedOrders[0] ? String(uninvoicedOrders[0].id) : ""
  );
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState("0.00");
  const [billingDrafts, setBillingDrafts] = useState<Record<number, BillingDraft>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<
    Record<number, { amount: string; method: string; note: string }>
  >({});
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDraft, setExportDraft] = useState({
    issued_from: "",
    issued_to: "",
    include_exported: false
  });
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const companyName = settingValue(settings, "general.company_name", "Project Depot");
  const companyAddress = settingValue(settings, "general.company_address", "");
  const paymentTermsDays = settingValue(settings, "invoicing.payment_terms_days", "30");

  const billingDraftFor = (invoice: Invoice): BillingDraft =>
    billingDrafts[invoice.id] ?? {
      billing_address: invoice.billing_address,
      buyer_tin: invoice.buyer_tin ?? "",
      buyer_registration_number: invoice.buyer_registration_number ?? "",
      buyer_sst_registration_number: invoice.buyer_sst_registration_number ?? ""
    };
  const paymentDraftFor = (invoice: Invoice) =>
    paymentDrafts[invoice.id] ?? {
      amount: ((invoice.total_cents - invoice.amount_paid_cents) / 100).toFixed(2),
      method: paymentMethods[0],
      note: ""
    };

  const handleCreateInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreate) {
      notify({ severity: "error", title: "Invoice not created", message: "The active role cannot create invoices.", scope: "invoices", dedupeKey: "invoices:create:permission" });
      return;
    }

    const orderId = Number(newInvoiceOrderId);
    const discountCents = Math.round(Number(newInvoiceDiscount) * 100);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      notify({ severity: "warning", title: "Select an order", message: "Select an order before creating an invoice.", scope: "invoices", dedupeKey: "invoices:create:validation" });
      return;
    }

    setIsCreating(true);

    try {
      const invoice = await onCreateInvoiceFromOrder(orderId, {
        discount_cents: Number.isFinite(discountCents) && discountCents > 0 ? discountCents : undefined
      });
      setNewInvoiceDiscount("0.00");
      notify({ severity: "success", title: "Invoice created", message: `Invoice ${invoice.invoice_number} was created successfully.`, scope: "invoices", dedupeKey: `invoices:${invoice.id}:create:success` });
    } catch (error) {
      notifyError(error, { operation: "create invoice", scope: "invoices", dedupeKey: `invoices:order:${orderId}:create:error` });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveBilling = async (event: FormEvent<HTMLFormElement>, invoice: Invoice) => {
    event.preventDefault();

    if (!canUpdate) {
      notify({ severity: "error", title: "Billing not updated", message: "The active role cannot update billing details.", scope: "invoices", dedupeKey: "invoices:billing:permission" });
      return;
    }

    setBusyInvoiceId(invoice.id);

    try {
      const draft = billingDraftFor(invoice);
      const updated = await onUpdateInvoiceBilling(invoice.id, {
        billing_address: draft.billing_address.trim(),
        buyer_tin: draft.buyer_tin.trim() || null,
        buyer_registration_number: draft.buyer_registration_number.trim() || null,
        buyer_sst_registration_number: draft.buyer_sst_registration_number.trim() || null
      });
      setBillingDrafts((current) => ({
        ...current,
        [updated.id]: {
          billing_address: updated.billing_address,
          buyer_tin: updated.buyer_tin ?? "",
          buyer_registration_number: updated.buyer_registration_number ?? "",
          buyer_sst_registration_number: updated.buyer_sst_registration_number ?? ""
        }
      }));
      notify({ severity: "success", title: "Billing details updated", message: `Billing details for ${updated.invoice_number} were updated successfully.`, scope: "invoices", dedupeKey: `invoices:${updated.id}:billing:success` });
    } catch (error) {
      notifyError(error, { operation: "update invoice billing", scope: "invoices", dedupeKey: `invoices:${invoice.id}:billing:error` });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleRecordPayment = async (event: FormEvent<HTMLFormElement>, invoice: Invoice) => {
    event.preventDefault();

    if (!canUpdate) {
      notify({ severity: "error", title: "Payment not recorded", message: "The active role cannot record invoice payments.", scope: "invoices", dedupeKey: "invoices:payment:permission" });
      return;
    }

    const draft = paymentDraftFor(invoice);
    const amountCents = Math.round(Number(draft.amount) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      notify({ severity: "warning", title: "Check the payment amount", message: "Enter a payment amount above zero.", scope: "invoices", dedupeKey: `invoices:${invoice.id}:payment:validation` });
      return;
    }

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
      notify({ severity: "success", title: "Payment recorded", message: `Payment for ${updated.invoice_number} was recorded successfully.`, scope: "invoices", dedupeKey: `invoices:${updated.id}:payment:success` });
    } catch (error) {
      notifyError(error, { operation: "record invoice payment", scope: "invoices", dedupeKey: `invoices:${invoice.id}:payment:error` });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (!canUpdate) {
      notify({ severity: "error", title: "Invoice not voided", message: "The active role cannot void invoices.", scope: "invoices", dedupeKey: "invoices:void:permission" });
      return;
    }

    const confirmed = window.confirm(`Void invoice ${invoice.invoice_number}?`);
    if (!confirmed) {
      return;
    }

    setBusyInvoiceId(invoice.id);

    try {
      const updated = await onVoidInvoice(invoice.id);
      notify({ severity: "success", title: "Invoice voided", message: `${updated.invoice_number} was voided successfully.`, scope: "invoices", dedupeKey: `invoices:${updated.id}:void:success` });
    } catch (error) {
      notifyError(error, { operation: "void invoice", scope: "invoices", dedupeKey: `invoices:${invoice.id}:void:error` });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handlePrint = (invoice: Invoice) => {
    setPrintingInvoice(invoice);
    window.setTimeout(() => window.print(), 50);
  };

  const handleExportAutoCount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUpdate) {
      notify({ severity: "error", title: "Invoices not exported", message: "The active role cannot export invoices.", scope: "invoices", dedupeKey: "invoices:export:permission" });
      return;
    }

    const issuedFrom = exportDraft.issued_from
      ? `${exportDraft.issued_from}T00:00:00Z`
      : undefined;
    const issuedTo = exportDraft.issued_to
      ? `${exportDraft.issued_to}T23:59:59Z`
      : undefined;

    setIsExporting(true);

    try {
      await onExportAutoCountInvoices({
        issued_from: issuedFrom,
        issued_to: issuedTo,
        include_exported: exportDraft.include_exported
      });
      notify({ severity: "success", title: "Invoices exported", message: "The AutoCount invoice export was downloaded successfully.", scope: "invoices", dedupeKey: "invoices:export:success" });
    } catch (error) {
      notifyError(error, { operation: "export invoices", scope: "invoices", dedupeKey: "invoices:export:error" });
    } finally {
      setIsExporting(false);
    }
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

      <article className="dashboard-panel no-print">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Accounting</p>
            <h3>AutoCount export</h3>
          </div>
          <span className={`status-pill ${canUpdate ? "live" : ""}`}>
            {canUpdate ? "Ready" : "Read only"}
          </span>
        </div>

        <form className="admin-form-grid sales-inline-form" onSubmit={(event) => void handleExportAutoCount(event)}>
          <label className="admin-field">
            Issued from
            <input
              disabled={!canUpdate}
              onChange={(event) =>
                setExportDraft((current) => ({ ...current, issued_from: event.target.value }))
              }
              type="date"
              value={exportDraft.issued_from}
            />
          </label>
          <label className="admin-field">
            Issued to
            <input
              disabled={!canUpdate}
              onChange={(event) =>
                setExportDraft((current) => ({ ...current, issued_to: event.target.value }))
              }
              type="date"
              value={exportDraft.issued_to}
            />
          </label>
          <label className="admin-field checkbox-field">
            <input
              checked={exportDraft.include_exported}
              disabled={!canUpdate}
              onChange={(event) =>
                setExportDraft((current) => ({
                  ...current,
                  include_exported: event.target.checked
                }))
              }
              type="checkbox"
            />
            Include exported
          </label>
          <button className="solid-button" disabled={!canUpdate || isExporting} type="submit">
            {isExporting ? "Exporting..." : "Download CSV"}
          </button>
        </form>
      </article>

      {invoices.length === 0 ? (
        <p className="no-print">No invoices have been created yet.</p>
      ) : (
        <div className="invoices-list no-print">
          {invoices.map((invoice) => {
            const remainingCents = invoice.total_cents - invoice.amount_paid_cents;
            const billingDraft = billingDraftFor(invoice);
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
                  <div>
                    <span>AutoCount</span>
                    <strong>
                      {invoice.exported_to_autocount_at
                        ? formatOrderDate(invoice.exported_to_autocount_at)
                        : "Not exported"}
                    </strong>
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
                        setBillingDrafts((current) => ({
                          ...current,
                          [invoice.id]: { ...billingDraft, billing_address: event.target.value }
                        }))
                      }
                      value={billingDraft.billing_address}
                    />
                  </label>
                  <label className="admin-field">
                    Buyer TIN
                    <input
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setBillingDrafts((current) => ({
                          ...current,
                          [invoice.id]: { ...billingDraft, buyer_tin: event.target.value }
                        }))
                      }
                      placeholder="Optional"
                      value={billingDraft.buyer_tin}
                    />
                  </label>
                  <label className="admin-field">
                    Registration no.
                    <input
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setBillingDrafts((current) => ({
                          ...current,
                          [invoice.id]: {
                            ...billingDraft,
                            buyer_registration_number: event.target.value
                          }
                        }))
                      }
                      placeholder="Optional"
                      value={billingDraft.buyer_registration_number}
                    />
                  </label>
                  <label className="admin-field">
                    SST no.
                    <input
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setBillingDrafts((current) => ({
                          ...current,
                          [invoice.id]: {
                            ...billingDraft,
                            buyer_sst_registration_number: event.target.value
                          }
                        }))
                      }
                      placeholder="Optional"
                      value={billingDraft.buyer_sst_registration_number}
                    />
                  </label>
                  <button className="outline-button" disabled={!canUpdate || isBusy} type="submit">
                    Save billing
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
          {hasMore ? (
            <div className="table-pagination-actions">
              <button
                className="outline-button"
                disabled={isLoadingMore}
                onClick={onLoadMore}
                type="button"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
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
            {printingInvoice.buyer_tin ? <p>TIN: {printingInvoice.buyer_tin}</p> : null}
            {printingInvoice.buyer_registration_number ? (
              <p>Registration: {printingInvoice.buyer_registration_number}</p>
            ) : null}
            {printingInvoice.buyer_sst_registration_number ? (
              <p>SST: {printingInvoice.buyer_sst_registration_number}</p>
            ) : null}
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
            <div>
              <span>Balance due</span>
              <strong>
                {currencyFromCents(printingInvoice.total_cents - printingInvoice.amount_paid_cents)}
              </strong>
            </div>
          </div>

          <p className="invoice-print-terms">Payment due within {paymentTermsDays} days of the issue date.</p>
        </div>
      ) : null}
    </section>
  );
}
