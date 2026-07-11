import { useState } from "react";

import { ManagementTable } from "../../../shared/components/ManagementTable";
import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import type {
  SalesRecord,
  SalesStatus,
  SalesSummaryPayload,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput
} from "../types";

const salesChannels = ["web", "pro-desk", "phone", "in-store"];

const salesTransitions: Record<SalesStatus, SalesStatus[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["paid", "cancelled"],
  paid: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: []
};

type SalesPanelProps = {
  canUpdate: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onUpdateSalesDetails: (orderId: number, input: UpdateSalesDetailsInput) => Promise<SalesRecord>;
  onUpdateSalesStatus: (orderId: number, input: UpdateSalesStatusInput) => Promise<SalesRecord>;
  sales: SalesRecord[];
  summary: SalesSummaryPayload | null;
};

type DetailsDraft = {
  channel: string;
  sales_rep: string;
  discount: string;
};

function detailsDraftFor(sale: SalesRecord): DetailsDraft {
  return {
    channel: sale.channel,
    sales_rep: sale.sales_rep,
    discount: (sale.discount_cents / 100).toFixed(2)
  };
}

function statusPillClass(status: SalesStatus): string {
  if (status === "paid" || status === "fulfilled") {
    return "live";
  }

  if (status === "cancelled") {
    return "danger";
  }

  return "warning";
}

export function SalesPanel({
  canUpdate,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onUpdateSalesDetails,
  onUpdateSalesStatus,
  sales,
  summary
}: SalesPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [detailsDrafts, setDetailsDrafts] = useState<Record<number, DetailsDraft>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<number, { status: string; note: string }>>({});
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

  const draftFor = (sale: SalesRecord): DetailsDraft => detailsDrafts[sale.order_id] ?? detailsDraftFor(sale);
  const statusDraftFor = (sale: SalesRecord) =>
    statusDrafts[sale.order_id] ?? {
      status: salesTransitions[sale.status][0] ?? sale.status,
      note: ""
    };

  const saveDetails = async (sale: SalesRecord) => {
    if (!canUpdate) {
      notify({ severity: "error", title: "Sale not updated", message: "The active role cannot update sales details.", scope: "sales", dedupeKey: "sales:details:permission" });
      return;
    }

    const draft = draftFor(sale);
    const discountCents = Math.round(Number(draft.discount) * 100);

    if (!Number.isFinite(discountCents) || discountCents < 0) {
      notify({ severity: "warning", title: "Check the discount", message: "Discount must be zero or greater.", scope: "sales", dedupeKey: `sales:${sale.order_id}:discount:validation` });
      return;
    }

    setSavingOrderId(sale.order_id);

    try {
      const updated = await onUpdateSalesDetails(sale.order_id, {
        channel: draft.channel.trim(),
        sales_rep: draft.sales_rep.trim(),
        discount_cents: discountCents
      });
      setDetailsDrafts((current) => ({ ...current, [updated.order_id]: detailsDraftFor(updated) }));
      notify({ severity: "success", title: "Sale details updated", message: `Sale #${updated.order_id} details were updated successfully.`, scope: "sales", dedupeKey: `sales:${updated.order_id}:details:success` });
    } catch (error) {
      notifyError(error, { operation: "update sale details", scope: "sales", dedupeKey: `sales:${sale.order_id}:details:error` });
    } finally {
      setSavingOrderId(null);
    }
  };

  const updateStatus = async (sale: SalesRecord) => {
    if (!canUpdate) {
      notify({ severity: "error", title: "Status not changed", message: "The active role cannot change sales status.", scope: "sales", dedupeKey: "sales:status:permission" });
      return;
    }

    const draft = statusDraftFor(sale);

    setSavingOrderId(sale.order_id);

    try {
      const updated = await onUpdateSalesStatus(sale.order_id, {
        status: draft.status,
        note: draft.note.trim()
      });
      setStatusDrafts((current) => {
        const next = { ...current };
        delete next[updated.order_id];
        return next;
      });
      notify({ severity: "success", title: "Sales status updated", message: `Sale #${updated.order_id} was moved to ${updated.status} successfully.`, scope: "sales", dedupeKey: `sales:${updated.order_id}:status:success` });
    } catch (error) {
      notifyError(error, { operation: "update sale status", scope: "sales", dedupeKey: `sales:${sale.order_id}:status:error` });
    } finally {
      setSavingOrderId(null);
    }
  };

  const salesColumns = [
    {
      key: "order",
      label: "Order",
      align: "right" as const,
      sortValue: (sale: SalesRecord) => sale.order_id,
      render: (sale: SalesRecord) => `#${sale.order_id}`
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (sale: SalesRecord) => sale.customer_name,
      render: (sale: SalesRecord) => (
        <div className="table-cell-main">
          <strong>{sale.customer_name}</strong>
          <span>{sale.customer_email}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      sortValue: (sale: SalesRecord) => sale.status,
      render: (sale: SalesRecord) => (
        <span className={`status-pill ${statusPillClass(sale.status)}`}>{sale.status}</span>
      )
    },
    {
      key: "payment",
      label: "Payment",
      sortValue: (sale: SalesRecord) => sale.payment_status,
      render: (sale: SalesRecord) => sale.payment_status
    },
    {
      key: "channel",
      label: "Channel",
      sortValue: (sale: SalesRecord) => sale.channel,
      render: (sale: SalesRecord) => {
        const draft = draftFor(sale);

        return (
          <select
            className="table-select"
            disabled={!canUpdate}
            onChange={(event) =>
              setDetailsDrafts((current) => ({
                ...current,
                [sale.order_id]: { ...draft, channel: event.target.value }
              }))
            }
            value={draft.channel}
          >
            {salesChannels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: "sales_rep",
      label: "Sales rep",
      sortValue: (sale: SalesRecord) => sale.sales_rep,
      render: (sale: SalesRecord) => {
        const draft = draftFor(sale);

        return (
          <input
            className="table-input"
            disabled={!canUpdate}
            onChange={(event) =>
              setDetailsDrafts((current) => ({
                ...current,
                [sale.order_id]: { ...draft, sales_rep: event.target.value }
              }))
            }
            placeholder="Optional"
            value={draft.sales_rep}
          />
        );
      }
    },
    {
      key: "discount",
      label: "Discount",
      align: "right" as const,
      sortValue: (sale: SalesRecord) => sale.discount_cents,
      render: (sale: SalesRecord) => {
        const draft = draftFor(sale);

        return (
          <input
            className="table-input table-money-input"
            disabled={!canUpdate}
            min="0"
            onChange={(event) =>
              setDetailsDrafts((current) => ({
                ...current,
                [sale.order_id]: { ...draft, discount: event.target.value }
              }))
            }
            step="0.01"
            type="number"
            value={draft.discount}
          />
        );
      }
    },
    {
      key: "subtotal",
      label: "Subtotal",
      align: "right" as const,
      sortValue: (sale: SalesRecord) => sale.subtotal_cents,
      render: (sale: SalesRecord) => currencyFromCents(sale.subtotal_cents)
    },
    {
      key: "tax",
      label: "Tax",
      align: "right" as const,
      sortValue: (sale: SalesRecord) => sale.tax_cents,
      render: (sale: SalesRecord) => currencyFromCents(sale.tax_cents)
    },
    {
      key: "total",
      label: "Total",
      align: "right" as const,
      sortValue: (sale: SalesRecord) => sale.total_cents,
      render: (sale: SalesRecord) => currencyFromCents(sale.total_cents)
    },
    {
      key: "updated",
      label: "Updated",
      sortValue: (sale: SalesRecord) => sale.updated_at,
      render: (sale: SalesRecord) => formatOrderDate(sale.updated_at)
    },
    {
      key: "save",
      label: "Details",
      render: (sale: SalesRecord) => {
        const isSaving = savingOrderId === sale.order_id;

        return (
          <button
            className="outline-button table-action"
            disabled={!canUpdate || isSaving}
            onClick={() => void saveDetails(sale)}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        );
      }
    },
    {
      key: "move_to",
      label: "Move to",
      render: (sale: SalesRecord) => {
        const allowedNextStatuses = salesTransitions[sale.status];
        const statusDraft = statusDraftFor(sale);

        if (allowedNextStatuses.length === 0) {
          return <span className="table-muted">Final</span>;
        }

        return (
          <div className="table-control-stack">
            <select
              className="table-select"
              disabled={!canUpdate}
              onChange={(event) =>
                setStatusDrafts((current) => ({
                  ...current,
                  [sale.order_id]: { ...statusDraft, status: event.target.value }
                }))
              }
              value={statusDraft.status}
            >
              {allowedNextStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              className="table-input"
              disabled={!canUpdate}
              onChange={(event) =>
                setStatusDrafts((current) => ({
                  ...current,
                  [sale.order_id]: { ...statusDraft, note: event.target.value }
                }))
              }
              placeholder="Note"
              value={statusDraft.note}
            />
          </div>
        );
      }
    },
    {
      key: "status_action",
      label: "Status action",
      render: (sale: SalesRecord) => {
        const isSaving = savingOrderId === sale.order_id;

        if (salesTransitions[sale.status].length === 0) {
          return null;
        }

        return (
          <button
            className="solid-button table-action"
            disabled={!canUpdate || isSaving}
            onClick={() => void updateStatus(sale)}
            type="button"
          >
            {isSaving ? "Saving..." : "Update"}
          </button>
        );
      }
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sales pipeline</p>
          <h3>Manage sales status, channel and discounts</h3>
        </div>
        <span className="status-pill">{sales.length} sales</span>
      </div>

      {summary ? (
        <div className="metric-grid">
          <article className="metric-card">
            <p>Total revenue</p>
            <strong>{currencyFromCents(summary.total_revenue_cents)}</strong>
            <span>{summary.order_count} sales tracked</span>
          </article>
          {summary.by_status.map((row) => (
            <article className="metric-card" key={row.status}>
              <p>{row.status}</p>
              <strong>{currencyFromCents(row.total_cents)}</strong>
              <span>{row.count} sales</span>
            </article>
          ))}
        </div>
      ) : null}

      {sales.length === 0 ? (
        <p>No sales have been recorded yet.</p>
      ) : (
        <ManagementTable
          columns={salesColumns}
          emptyMessage="No sales have been recorded yet."
          getRowKey={(sale) => sale.order_id}
          hasMore={hasMore}
          initialSortDirection="desc"
          initialSortKey="updated"
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          rows={sales}
          tableLabel="Sales management table"
        />
      )}
    </section>
  );
}
