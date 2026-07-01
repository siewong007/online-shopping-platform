import { type FormEvent, useState } from "react";

import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
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
  onUpdateSalesDetails,
  onUpdateSalesStatus,
  sales,
  summary
}: SalesPanelProps) {
  const [detailsDrafts, setDetailsDrafts] = useState<Record<number, DetailsDraft>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<number, { status: string; note: string }>>({});
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

  const draftFor = (sale: SalesRecord): DetailsDraft => detailsDrafts[sale.order_id] ?? detailsDraftFor(sale);
  const statusDraftFor = (sale: SalesRecord) =>
    statusDrafts[sale.order_id] ?? {
      status: salesTransitions[sale.status][0] ?? sale.status,
      note: ""
    };

  const handleSaveDetails = async (event: FormEvent<HTMLFormElement>, sale: SalesRecord) => {
    event.preventDefault();

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot update sales details." });
      return;
    }

    const draft = draftFor(sale);
    const discountCents = Math.round(Number(draft.discount) * 100);

    if (!Number.isFinite(discountCents) || discountCents < 0) {
      setFeedback({ kind: "error", message: "Discount must be zero or greater." });
      return;
    }

    setFeedback(null);
    setSavingOrderId(sale.order_id);

    try {
      const updated = await onUpdateSalesDetails(sale.order_id, {
        channel: draft.channel.trim(),
        sales_rep: draft.sales_rep.trim(),
        discount_cents: discountCents
      });
      setDetailsDrafts((current) => ({ ...current, [updated.order_id]: detailsDraftFor(updated) }));
      setFeedback({ kind: "success", message: `Sale #${updated.order_id} details were updated.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update sale details."
      });
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleUpdateStatus = async (event: FormEvent<HTMLFormElement>, sale: SalesRecord) => {
    event.preventDefault();

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot change sales status." });
      return;
    }

    const draft = statusDraftFor(sale);

    setFeedback(null);
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
      setFeedback({
        kind: "success",
        message: `Sale #${updated.order_id} moved to ${updated.status}.`
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update sale status."
      });
    } finally {
      setSavingOrderId(null);
    }
  };

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

      {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}

      {sales.length === 0 ? (
        <p>No sales have been recorded yet.</p>
      ) : (
        <div className="sales-list">
          {sales.map((sale) => {
            const draft = draftFor(sale);
            const statusDraft = statusDraftFor(sale);
            const allowedNextStatuses = salesTransitions[sale.status];
            const isSaving = savingOrderId === sale.order_id;

            return (
              <article className="dashboard-panel sales-row" key={sale.order_id}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Order #{sale.order_id}</p>
                    <h4>{sale.customer_name}</h4>
                    <span>{sale.customer_email}</span>
                  </div>
                  <span className={`status-pill ${statusPillClass(sale.status)}`}>{sale.status}</span>
                </div>

                <div className="sales-detail-grid">
                  <div>
                    <span>Subtotal</span>
                    <strong>{currencyFromCents(sale.subtotal_cents)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{currencyFromCents(sale.tax_cents)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{currencyFromCents(sale.total_cents)}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>{sale.payment_status}</strong>
                  </div>
                  <div>
                    <span>Updated</span>
                    <strong>{formatOrderDate(sale.updated_at)}</strong>
                  </div>
                </div>

                <form
                  className="admin-form-grid sales-inline-form"
                  onSubmit={(event) => void handleSaveDetails(event, sale)}
                >
                  <label className="admin-field">
                    Channel
                    <select
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
                  </label>
                  <label className="admin-field">
                    Sales rep
                    <input
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
                  </label>
                  <label className="admin-field">
                    Discount
                    <input
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
                  </label>
                  <button className="outline-button" disabled={!canUpdate || isSaving} type="submit">
                    Save details
                  </button>
                </form>

                {allowedNextStatuses.length > 0 ? (
                  <form
                    className="admin-form-grid sales-inline-form"
                    onSubmit={(event) => void handleUpdateStatus(event, sale)}
                  >
                    <label className="admin-field">
                      Move to
                      <select
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
                    </label>
                    <label className="admin-field">
                      Note
                      <input
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setStatusDrafts((current) => ({
                            ...current,
                            [sale.order_id]: { ...statusDraft, note: event.target.value }
                          }))
                        }
                        placeholder="Optional"
                        value={statusDraft.note}
                      />
                    </label>
                    <button className="solid-button" disabled={!canUpdate || isSaving} type="submit">
                      {isSaving ? "Saving..." : "Update status"}
                    </button>
                  </form>
                ) : (
                  <p className="sales-terminal-note">This sale has reached a final status.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
