import { type FormEvent, useMemo, useState } from "react";

import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import { ManagementTable } from "../../../shared/components/ManagementTable";
import {
  RecordForm,
  type RecordFormField,
  RecordModal
} from "../../../shared/components/RecordModal";
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

type InvoiceStatusFilter = "all" | InvoiceStatus;

const invoiceStatusFilters: { key: InvoiceStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partial" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "void", label: "Void" }
];

type BillingDraft = {
  billing_address: string;
  buyer_tin: string;
  buyer_registration_number: string;
  buyer_sst_registration_number: string;
};

type PaymentDraft = {
  amount: string;
  method: string;
  note: string;
};

const billingFields: RecordFormField<BillingDraft>[] = [
  {
    name: "billing_address",
    label: "Billing address",
    type: "textarea",
    rows: 3,
    placeholder: "Street, city, postcode"
  },
  {
    name: "buyer_tin",
    label: "Buyer TIN",
    placeholder: "Optional"
  },
  {
    name: "buyer_registration_number",
    label: "Registration no.",
    placeholder: "Optional"
  },
  {
    name: "buyer_sst_registration_number",
    label: "SST no.",
    placeholder: "Optional"
  }
];

const paymentFields: RecordFormField<PaymentDraft>[] = [
  {
    name: "amount",
    label: "Amount",
    type: "number",
    required: true,
    min: 0.01,
    step: "0.01",
    validate: (value) => {
      const cents = Math.round(Number(value) * 100);
      return Number.isFinite(cents) && cents > 0 ? null : "Enter a payment amount above zero.";
    }
  },
  {
    name: "method",
    label: "Method",
    type: "select",
    required: true,
    options: paymentMethods.map((method) => ({ label: method, value: method }))
  },
  {
    name: "note",
    label: "Note",
    placeholder: "Optional"
  }
];

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
  onRecordInvoicePayment: (invoiceId: number, input: RecordInvoicePaymentInput) => Promise<Invoice>;
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
  const uninvoicedOrders = useMemo(() => {
    const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.order_id));
    return orders.filter((order) => !invoicedOrderIds.has(order.id));
  }, [invoices, orders]);

  const [newInvoiceOrderId, setNewInvoiceOrderId] = useState(
    uninvoicedOrders[0] ? String(uninvoicedOrders[0].id) : ""
  );
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState("0.00");
  const [editingBillingInvoiceId, setEditingBillingInvoiceId] = useState<number | null>(null);
  const [billingForm, setBillingForm] = useState<BillingDraft>({
    billing_address: "",
    buyer_tin: "",
    buyer_registration_number: "",
    buyer_sst_registration_number: ""
  });
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentDraft>({
    amount: "",
    method: paymentMethods[0],
    note: ""
  });
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("all");
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDraft, setExportDraft] = useState({
    issued_from: "",
    issued_to: "",
    include_exported: false
  });
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const companyName = settingValue(settings, "general.company_name", "Ekoway Hardware");
  const companyAddress = settingValue(settings, "general.company_address", "");
  const paymentTermsDays = settingValue(settings, "invoicing.payment_terms_days", "30");

  const selectedNewInvoiceOrderId =
    uninvoicedOrders.length === 0
      ? ""
      : uninvoicedOrders.some((order) => String(order.id) === newInvoiceOrderId)
        ? newInvoiceOrderId
        : String(uninvoicedOrders[0].id);

  const billingInvoice =
    editingBillingInvoiceId === null
      ? null
      : (invoices.find((invoice) => invoice.id === editingBillingInvoiceId) ?? null);

  const paymentInvoice =
    paymentInvoiceId === null
      ? null
      : (invoices.find((invoice) => invoice.id === paymentInvoiceId) ?? null);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.status === statusFilter);
  }, [invoices, statusFilter]);

  const invoiceSearchText = (invoice: Invoice) =>
    `${invoice.invoice_number} #${invoice.order_id} ${invoice.billing_name} ${invoice.billing_email} ${invoice.buyer_tin ?? ""} ${invoice.status}`;

  const searchedInvoiceCount = useMemo(() => {
    const query = invoiceSearch.trim().toLocaleLowerCase();
    if (!query) {
      return filteredInvoices.length;
    }

    return filteredInvoices.filter((invoice) =>
      `${invoice.invoice_number} #${invoice.order_id} ${invoice.billing_name} ${invoice.billing_email} ${invoice.buyer_tin ?? ""} ${invoice.status}`
        .toLocaleLowerCase()
        .includes(query)
    ).length;
  }, [filteredInvoices, invoiceSearch]);

  const openBillingModal = (invoice: Invoice) => {
    setEditingBillingInvoiceId(invoice.id);
    setBillingForm({
      billing_address: invoice.billing_address,
      buyer_tin: invoice.buyer_tin ?? "",
      buyer_registration_number: invoice.buyer_registration_number ?? "",
      buyer_sst_registration_number: invoice.buyer_sst_registration_number ?? ""
    });
  };

  const closeBillingModal = () => {
    setEditingBillingInvoiceId(null);
  };

  const openPaymentModal = (invoice: Invoice) => {
    const remainingCents = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);
    setPaymentInvoiceId(invoice.id);
    setPaymentForm({
      amount: (remainingCents / 100).toFixed(2),
      method: paymentMethods[0],
      note: ""
    });
  };

  const closePaymentModal = () => {
    setPaymentInvoiceId(null);
  };

  const handleCreateInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreate) {
      notify({
        severity: "error",
        title: "Invoice not created",
        message: "The active role cannot create invoices.",
        scope: "invoices",
        dedupeKey: "invoices:create:permission"
      });
      return;
    }

    const orderId = Number(selectedNewInvoiceOrderId);
    const discountCents = Math.round(Number(newInvoiceDiscount) * 100);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      notify({
        severity: "warning",
        title: "Select an order",
        message: "Select an order before creating an invoice.",
        scope: "invoices",
        dedupeKey: "invoices:create:validation"
      });
      return;
    }

    setIsCreating(true);

    try {
      const invoice = await onCreateInvoiceFromOrder(orderId, {
        discount_cents:
          Number.isFinite(discountCents) && discountCents > 0 ? discountCents : undefined
      });
      setNewInvoiceDiscount("0.00");
      notify({
        severity: "success",
        title: "Invoice created",
        message: `Invoice ${invoice.invoice_number} was created successfully.`,
        scope: "invoices",
        dedupeKey: `invoices:${invoice.id}:create:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "create invoice",
        scope: "invoices",
        dedupeKey: `invoices:order:${orderId}:create:error`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!billingInvoice) {
      return;
    }

    if (!canUpdate) {
      notify({
        severity: "error",
        title: "Billing not updated",
        message: "The active role cannot update billing details.",
        scope: "invoices",
        dedupeKey: "invoices:billing:permission"
      });
      return;
    }

    setBusyInvoiceId(billingInvoice.id);

    try {
      const updated = await onUpdateInvoiceBilling(billingInvoice.id, {
        billing_address: billingForm.billing_address.trim(),
        buyer_tin: billingForm.buyer_tin.trim() || null,
        buyer_registration_number: billingForm.buyer_registration_number.trim() || null,
        buyer_sst_registration_number: billingForm.buyer_sst_registration_number.trim() || null
      });
      closeBillingModal();
      notify({
        severity: "success",
        title: "Billing details updated",
        message: `Billing details for ${updated.invoice_number} were updated successfully.`,
        scope: "invoices",
        dedupeKey: `invoices:${updated.id}:billing:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "update invoice billing",
        scope: "invoices",
        dedupeKey: `invoices:${billingInvoice.id}:billing:error`
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoice) {
      return;
    }

    if (!canUpdate) {
      notify({
        severity: "error",
        title: "Payment not recorded",
        message: "The active role cannot record invoice payments.",
        scope: "invoices",
        dedupeKey: "invoices:payment:permission"
      });
      return;
    }

    const amountCents = Math.round(Number(paymentForm.amount) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      notify({
        severity: "warning",
        title: "Check the payment amount",
        message: "Enter a payment amount above zero.",
        scope: "invoices",
        dedupeKey: `invoices:${paymentInvoice.id}:payment:validation`
      });
      return;
    }

    setBusyInvoiceId(paymentInvoice.id);

    try {
      const updated = await onRecordInvoicePayment(paymentInvoice.id, {
        amount_cents: amountCents,
        method: paymentForm.method,
        note: paymentForm.note.trim()
      });
      closePaymentModal();
      notify({
        severity: "success",
        title: "Payment recorded",
        message: `Payment for ${updated.invoice_number} was recorded successfully.`,
        scope: "invoices",
        dedupeKey: `invoices:${updated.id}:payment:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "record invoice payment",
        scope: "invoices",
        dedupeKey: `invoices:${paymentInvoice.id}:payment:error`
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const requestVoidInvoice = (invoice: Invoice) => {
    if (!canUpdate) {
      notify({
        severity: "error",
        title: "Invoice not voided",
        message: "The active role cannot void invoices.",
        scope: "invoices",
        dedupeKey: "invoices:void:permission"
      });
      return;
    }

    setVoidingInvoice(invoice);
  };

  const executeVoidInvoice = async () => {
    if (!voidingInvoice || !canUpdate) {
      setVoidingInvoice(null);
      return;
    }

    const invoice = voidingInvoice;
    setBusyInvoiceId(invoice.id);

    try {
      const updated = await onVoidInvoice(invoice.id);
      notify({
        severity: "success",
        title: "Invoice voided",
        message: `${updated.invoice_number} was voided successfully.`,
        scope: "invoices",
        dedupeKey: `invoices:${updated.id}:void:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "void invoice",
        scope: "invoices",
        dedupeKey: `invoices:${invoice.id}:void:error`
      });
    } finally {
      setBusyInvoiceId(null);
      setVoidingInvoice(null);
    }
  };

  const handlePrint = (invoice: Invoice) => {
    setPrintingInvoice(invoice);
    window.setTimeout(() => window.print(), 50);
  };

  const handleExportAutoCount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUpdate) {
      notify({
        severity: "error",
        title: "Invoices not exported",
        message: "The active role cannot export invoices.",
        scope: "invoices",
        dedupeKey: "invoices:export:permission"
      });
      return;
    }

    const issuedFrom = exportDraft.issued_from ? `${exportDraft.issued_from}T00:00:00Z` : undefined;
    const issuedTo = exportDraft.issued_to ? `${exportDraft.issued_to}T23:59:59Z` : undefined;

    setIsExporting(true);

    try {
      await onExportAutoCountInvoices({
        issued_from: issuedFrom,
        issued_to: issuedTo,
        include_exported: exportDraft.include_exported
      });
      notify({
        severity: "success",
        title: "Invoices exported",
        message: "The AutoCount invoice export was downloaded successfully.",
        scope: "invoices",
        dedupeKey: "invoices:export:success"
      });
    } catch (error) {
      notifyError(error, {
        operation: "export invoices",
        scope: "invoices",
        dedupeKey: "invoices:export:error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const invoiceColumns = [
    {
      key: "invoice_number",
      label: "Invoice #",
      sortValue: (invoice: Invoice) => invoice.invoice_number,
      render: (invoice: Invoice) => (
        <div className="table-cell-main">
          <strong>{invoice.invoice_number}</strong>
          <span>Issued {formatOrderDate(invoice.issued_at)}</span>
        </div>
      )
    },
    {
      key: "order_id",
      label: "Order #",
      align: "right" as const,
      sortValue: (invoice: Invoice) => invoice.order_id,
      render: (invoice: Invoice) => `#${invoice.order_id}`
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (invoice: Invoice) => invoice.billing_name,
      render: (invoice: Invoice) => (
        <div className="table-cell-main">
          <strong>{invoice.billing_name}</strong>
          <span>{invoice.billing_email}</span>
        </div>
      )
    },
    {
      key: "total",
      label: "Total",
      align: "right" as const,
      sortValue: (invoice: Invoice) => invoice.total_cents,
      render: (invoice: Invoice) => currencyFromCents(invoice.total_cents)
    },
    {
      key: "balance_due",
      label: "Balance Due",
      align: "right" as const,
      sortValue: (invoice: Invoice) => Math.max(invoice.total_cents - invoice.amount_paid_cents, 0),
      render: (invoice: Invoice) => {
        const remainingCents = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);
        return (
          <div className="table-cell-main">
            <strong>{currencyFromCents(remainingCents)}</strong>
            <span>Due {formatOrderDate(invoice.due_at)}</span>
          </div>
        );
      }
    },
    {
      key: "status",
      label: "Status",
      sortValue: (invoice: Invoice) => invoice.status,
      render: (invoice: Invoice) => (
        <div className="table-cell-main">
          <span className={`status-pill ${statusPillClass(invoice.status)}`}>{invoice.status}</span>
          <span className={`status-pill ${invoice.buyer_tin ? "live" : "warning"}`}>
            {invoice.buyer_tin ? "E-Invoice TIN" : "No TIN"}
          </span>
        </div>
      )
    },
    {
      key: "exported",
      label: "AutoCount",
      sortValue: (invoice: Invoice) => Boolean(invoice.exported_to_autocount_at),
      render: (invoice: Invoice) => (
        <span className={`status-pill ${invoice.exported_to_autocount_at ? "live" : ""}`}>
          {invoice.exported_to_autocount_at ? "Exported" : "Not exported"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (invoice: Invoice) => {
        const remainingCents = invoice.total_cents - invoice.amount_paid_cents;
        const isBusy = busyInvoiceId === invoice.id;
        const canVoid = invoice.status !== "void" && invoice.amount_paid_cents === 0;
        const canRecordPayment = invoice.status !== "void" && remainingCents > 0;

        return (
          <div className="management-action-stack">
            <button
              className="outline-button table-action"
              disabled={!canUpdate || isBusy}
              onClick={() => openBillingModal(invoice)}
              type="button"
            >
              Manage Billing
            </button>
            {canRecordPayment ? (
              <button
                className="solid-button table-action"
                disabled={!canUpdate || isBusy}
                onClick={() => openPaymentModal(invoice)}
                type="button"
              >
                Record Payment
              </button>
            ) : null}
            <button
              className="outline-button table-action"
              onClick={() => handlePrint(invoice)}
              type="button"
            >
              Print
            </button>
            {canVoid ? (
              <button
                className="outline-button danger-button table-action"
                disabled={!canUpdate || isBusy}
                onClick={() => requestVoidInvoice(invoice)}
                type="button"
              >
                Void
              </button>
            ) : null}
          </div>
        );
      }
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header no-print">
        <div>
          <p className="eyebrow">Invoicing</p>
          <h3>Generate and manage invoices</h3>
        </div>
        <span className="status-pill">{invoices.length} invoices</span>
      </div>

      <div className="admin-panels two-up invoices-utility-grid no-print">
        <article className="dashboard-panel">
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
            <form
              className="admin-form-grid sales-inline-form"
              onSubmit={(event) => void handleCreateInvoice(event)}
            >
              <label className="admin-field">
                Order
                <select
                  disabled={!canCreate}
                  onChange={(event) => setNewInvoiceOrderId(event.target.value)}
                  value={selectedNewInvoiceOrderId}
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

        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Accounting</p>
              <h3>AutoCount export</h3>
            </div>
            <span className={`status-pill ${canUpdate ? "live" : ""}`}>
              {canUpdate ? "Ready" : "Read only"}
            </span>
          </div>

          <form
            className="admin-form-grid sales-inline-form"
            onSubmit={(event) => void handleExportAutoCount(event)}
          >
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
      </div>

      <article className="dashboard-panel no-print">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Invoice ledger</p>
            <h3>Customer invoices</h3>
          </div>
          <span className="status-pill">{invoices.length} loaded</span>
        </div>

        {invoices.length === 0 ? (
          <p>No invoices have been created yet.</p>
        ) : (
          <ManagementTable
            columns={invoiceColumns}
            emptyMessage="No invoices match the current filter."
            filterSlot={
              <div
                className="management-filter-pills"
                role="group"
                aria-label="Filter by invoice status"
              >
                {invoiceStatusFilters.map((pill) => (
                  <button
                    aria-pressed={statusFilter === pill.key}
                    className={
                      statusFilter === pill.key
                        ? "solid-button table-action"
                        : "outline-button table-action"
                    }
                    key={pill.key}
                    onClick={() => setStatusFilter(pill.key)}
                    type="button"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            }
            getRowKey={(invoice) => invoice.id}
            getSearchText={invoiceSearchText}
            hasMore={hasMore}
            initialSortDirection="desc"
            initialSortKey="invoice_number"
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
            onSearchChange={setInvoiceSearch}
            rows={filteredInvoices}
            searchPlaceholder="Search invoice #, order #, customer, or TIN..."
            searchValue={invoiceSearch}
            summaryText={`${searchedInvoiceCount} of ${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`}
            tableLabel="Invoice management table"
          />
        )}
      </article>

      <div className="no-print">
        <RecordModal
          eyebrow={billingInvoice ? billingInvoice.invoice_number : "Billing"}
          isBusy={billingInvoice !== null && busyInvoiceId === billingInvoice.id}
          isOpen={billingInvoice !== null}
          onClose={closeBillingModal}
          statusLabel={canUpdate ? "Writable" : "Read only"}
          statusTone={canUpdate ? "live" : undefined}
          title={
            billingInvoice ? `Manage billing · ${billingInvoice.billing_name}` : "Manage billing"
          }
        >
          {billingInvoice ? (
            <RecordForm
              disabled={!canUpdate}
              fields={billingFields}
              isSubmitting={busyInvoiceId === billingInvoice.id}
              onCancel={closeBillingModal}
              onChange={setBillingForm}
              onSubmit={() => void handleSaveBilling()}
              submitLabel="Save billing"
              values={billingForm}
            />
          ) : null}
        </RecordModal>

        <RecordModal
          eyebrow={paymentInvoice ? paymentInvoice.invoice_number : "Invoice payment"}
          isBusy={paymentInvoice !== null && busyInvoiceId === paymentInvoice.id}
          isOpen={paymentInvoice !== null}
          onClose={closePaymentModal}
          statusLabel={paymentInvoice ? paymentInvoice.status : undefined}
          statusTone={
            paymentInvoice
              ? (statusPillClass(paymentInvoice.status) as "live" | "warning" | "danger" | "") ||
                undefined
              : undefined
          }
          title={
            paymentInvoice ? `Record payment · ${paymentInvoice.billing_name}` : "Record payment"
          }
        >
          {paymentInvoice ? (
            <RecordForm
              disabled={!canUpdate}
              fields={paymentFields}
              isSubmitting={busyInvoiceId === paymentInvoice.id}
              onCancel={closePaymentModal}
              onChange={setPaymentForm}
              onSubmit={() => void handleRecordPayment()}
              submitLabel="Record payment"
              values={paymentForm}
            >
              <div className="sales-detail-grid">
                <div>
                  <span>Invoice total</span>
                  <strong>{currencyFromCents(paymentInvoice.total_cents)}</strong>
                </div>
                <div>
                  <span>Paid so far</span>
                  <strong>{currencyFromCents(paymentInvoice.amount_paid_cents)}</strong>
                </div>
                <div>
                  <span>Balance due</span>
                  <strong>
                    {currencyFromCents(
                      Math.max(paymentInvoice.total_cents - paymentInvoice.amount_paid_cents, 0)
                    )}
                  </strong>
                </div>
              </div>
            </RecordForm>
          ) : null}
        </RecordModal>

        <ConfirmModal
          confirmLabel="Void invoice"
          eyebrow="Void invoice"
          isConfirming={voidingInvoice !== null && busyInvoiceId === voidingInvoice.id}
          isOpen={voidingInvoice !== null}
          message={
            voidingInvoice
              ? `Void invoice ${voidingInvoice.invoice_number} for ${voidingInvoice.billing_name}?`
              : ""
          }
          onCancel={() => setVoidingInvoice(null)}
          onConfirm={executeVoidInvoice}
          title={voidingInvoice ? `Void invoice ${voidingInvoice.invoice_number}` : "Void invoice"}
          tone="danger"
        />
      </div>

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

          <p className="invoice-print-terms">
            Payment due within {paymentTermsDays} days of the issue date.
          </p>
        </div>
      ) : null}
    </section>
  );
}
