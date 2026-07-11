import { useEffect, useMemo, useRef, useState } from "react";

import { currencyFromCents, formatOrderDate, formatRelativeTime } from "../../../shared/formatters";
import type { ActivityItem, AdminDashboardPayload } from "../types";
import type { Order } from "../../orders/types";
import type { Payment, PaymentStatus } from "../../payments/types";

type SavedView = "all" | "requires-action" | "high-priority" | "payment-failed" | "fulfillment-delayed" | "recent";
type Priority = "High" | "Medium" | "Normal" | "Resolved";
type SortKey = "id" | "customer" | "value" | "priority" | "updated";

type QueueItem = {
  assignedTo: string;
  issue: string;
  order: Order;
  payment: Payment | null;
  paymentStatus: PaymentStatus | "Not recorded";
  priority: Priority;
  requiresAction: boolean;
  updatedAt: string;
};

type OperationsConsoleProps = {
  activity: ActivityItem[];
  canRefresh: boolean;
  dashboard: AdminDashboardPayload;
  demoMode: boolean;
  onOpenFulfillment: () => void;
  onOpenOrders: () => void;
  onOpenPayments: () => void;
  onRefresh: () => void;
  orders: Order[];
  payments: Payment[];
};

const savedViews: { label: string; value: SavedView }[] = [
  { label: "Requires action", value: "requires-action" },
  { label: "High priority", value: "high-priority" },
  { label: "Payment failed", value: "payment-failed" },
  { label: "Fulfilment delayed", value: "fulfillment-delayed" },
  { label: "Recently updated", value: "recent" }
];

const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Normal: 2, Resolved: 3 };

function newestPayment(orderId: number, payments: Payment[]): Payment | null {
  return payments
    .filter((payment) => payment.order_id === orderId)
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0] ?? null;
}

function makeQueueItem(order: Order, payments: Payment[]): QueueItem {
  const payment = newestPayment(order.id, payments);
  const paymentStatus = payment?.status ?? "Not recorded";
  const latestFulfillment = order.fulfillment_history.at(-1);
  const updatedAt = [payment?.updated_at, latestFulfillment?.happened_at, order.created_at]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  if (paymentStatus === "Failed") {
    return { assignedTo: latestFulfillment?.changed_by ?? "Unassigned", issue: "Payment could not be verified", order, payment, paymentStatus, priority: "High", requiresAction: true, updatedAt };
  }
  if (paymentStatus === "Not recorded") {
    return { assignedTo: "Unassigned", issue: "Payment has not been recorded", order, payment, paymentStatus, priority: "High", requiresAction: true, updatedAt };
  }
  if (paymentStatus === "Pending") {
    return { assignedTo: latestFulfillment?.changed_by ?? "Unassigned", issue: "Payment is awaiting settlement", order, payment, paymentStatus, priority: "Medium", requiresAction: true, updatedAt };
  }
  if (order.fulfillment_status === "received" || order.fulfillment_status === "picking") {
    return { assignedTo: latestFulfillment?.changed_by ?? "Unassigned", issue: order.fulfillment_status === "received" ? "Fulfilment has not started" : "Picking is still in progress", order, payment, paymentStatus, priority: "Medium", requiresAction: true, updatedAt };
  }
  if (order.fulfillment_status === "canceled" || order.fulfillment_status === "completed" || order.fulfillment_status === "delivered") {
    return { assignedTo: latestFulfillment?.changed_by ?? "System", issue: order.fulfillment_status === "canceled" ? "Order cancelled" : "Order completed", order, payment, paymentStatus, priority: "Resolved", requiresAction: false, updatedAt };
  }
  return { assignedTo: latestFulfillment?.changed_by ?? "Unassigned", issue: "Fulfilment is progressing", order, payment, paymentStatus, priority: "Normal", requiresAction: false, updatedAt };
}

function statusClass(value: string): string {
  return value.toLowerCase().replaceAll(" ", "-").replaceAll("_", "-");
}

function sentenceCase(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());
}

function SvgIcon({ name }: { name: "alert" | "check" | "chevron" | "clock" | "close" | "columns" | "help" | "orders" | "refresh" | "search" }) {
  const paths = {
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    columns: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-.7.3-1 .8-1 1.7"/><path d="M12 17h.01"/></>,
    orders: <><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 9M4 15l2.4 2.6A7 7 0 0 0 18 15"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>
  };
  return <svg aria-hidden="true" className="console-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

export function OperationsConsole({ activity, canRefresh, dashboard, demoMode, onOpenFulfillment, onOpenOrders, onOpenPayments, onRefresh, orders, payments }: OperationsConsoleProps) {
  const [savedView, setSavedView] = useState<SavedView>("requires-action");
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "priority", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const queue = useMemo(() => orders.map((order) => makeQueueItem(order, payments)), [orders, payments]);
  const paymentIssues = queue.filter((item) => item.paymentStatus === "Failed" || item.paymentStatus === "Pending" || item.paymentStatus === "Not recorded").length;
  const delayed = queue.filter((item) => item.order.fulfillment_status === "received" || item.order.fulfillment_status === "picking").length;
  const requiresAction = queue.filter((item) => item.requiresAction).length;
  const highPriority = queue.filter((item) => item.priority === "High").length;
  const detailItem = queue.find((item) => item.order.id === detailId) ?? null;
  const latestTimestamp = queue.map((item) => item.updatedAt).sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  const filteredQueue = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const now = Date.now();
    const filtered = queue.filter((item) => {
      const matchesQuery = !lowerQuery || [item.order.id, item.order.customer_name, item.order.customer_email, item.issue, item.assignedTo].some((value) => String(value).toLowerCase().includes(lowerQuery));
      const matchesPayment = paymentFilter === "all" || item.paymentStatus === paymentFilter;
      const matchesMethod = methodFilter === "all" || item.order.fulfillment_method === methodFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const age = now - Date.parse(item.updatedAt);
      const matchesDate = dateFilter === "all" || (dateFilter === "today" && age <= 86_400_000) || (dateFilter === "7-days" && age <= 604_800_000) || (dateFilter === "30-days" && age <= 2_592_000_000);
      const matchesView = savedView === "all"
        || (savedView === "requires-action" && item.requiresAction)
        || (savedView === "high-priority" && item.priority === "High")
        || (savedView === "payment-failed" && item.paymentStatus === "Failed")
        || (savedView === "fulfillment-delayed" && (item.order.fulfillment_status === "received" || item.order.fulfillment_status === "picking"))
        || (savedView === "recent" && age <= 604_800_000);
      return matchesQuery && matchesPayment && matchesMethod && matchesPriority && matchesDate && matchesView;
    });

    return [...filtered].sort((left, right) => {
      const factor = sort.direction === "asc" ? 1 : -1;
      if (sort.key === "id") return (left.order.id - right.order.id) * factor;
      if (sort.key === "value") return (left.order.subtotal_cents - right.order.subtotal_cents) * factor;
      if (sort.key === "priority") return (priorityRank[left.priority] - priorityRank[right.priority]) * factor;
      if (sort.key === "updated") return (Date.parse(left.updatedAt) - Date.parse(right.updatedAt)) * factor;
      return left.order.customer_name.localeCompare(right.order.customer_name) * factor;
    });
  }, [dateFilter, methodFilter, paymentFilter, priorityFilter, query, queue, savedView, sort]);

  const allVisibleSelected = filteredQueue.length > 0 && filteredQueue.every((item) => selectedIds.has(item.order.id));
  const hasFilters = query || paymentFilter !== "all" || methodFilter !== "all" || priorityFilter !== "all" || dateFilter !== "all" || savedView !== "requires-action";

  useEffect(() => {
    if (detailId === null) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailId]);

  const selectView = (view: SavedView) => {
    setSavedView(view);
    if (view !== "payment-failed") setPaymentFilter("all");
    setPriorityFilter("all");
  };

  const clearFilters = () => {
    setQuery("");
    setPaymentFilter("all");
    setMethodFilter("all");
    setPriorityFilter("all");
    setDateFilter("all");
    setSavedView("requires-action");
  };

  const changeSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  const sortLabel = (key: SortKey) => sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const toggleRow = (id: number) => setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const metrics = [
    { label: "Orders in view", value: orders.length, detail: `${dashboard.live_metrics.orders_awaiting_fulfillment} awaiting fulfilment`, tone: "neutral", view: "all" as SavedView },
    { label: "Requires action", value: requiresAction, detail: `${highPriority} high priority`, tone: requiresAction ? "warning" : "success", view: "requires-action" as SavedView },
    { label: "Payment issues", value: paymentIssues, detail: paymentIssues ? "Review before fulfilment" : "No exceptions", tone: paymentIssues ? "danger" : "success", view: "payment-failed" as SavedView },
    { label: "Fulfilment delayed", value: delayed, detail: delayed ? "Orders need follow-up" : "Flow is on track", tone: delayed ? "warning" : "success", view: "fulfillment-delayed" as SavedView }
  ];

  return (
    <section className="operations-console" aria-labelledby="console-title">
      <header className="console-page-header">
        <div>
          <div className="console-title-row"><p className="eyebrow">Store operations</p><span className={`console-health ${demoMode ? "warning" : "live"}`}>{demoMode ? "Demo data" : "Systems operational"}</span></div>
          <h2 id="console-title">OPT Console</h2>
          <p>Monitor exceptions, prioritise urgent orders and take action without leaving the queue.</p>
        </div>
        <div className="console-header-actions">
          <span className="console-updated"><SvgIcon name="clock" />Last updated {latestTimestamp ? formatOrderDate(latestTimestamp) : "just now"}</span>
          <a className="console-icon-button" href="#console-help" aria-label="Open console help" title="Console help"><SvgIcon name="help" /></a>
          <button className="console-secondary-button" disabled={!canRefresh} onClick={onRefresh} title={canRefresh ? "Refresh operational data" : "You do not have permission to refresh operational data"} type="button"><SvgIcon name="refresh" />Refresh</button>
          <button className="console-primary-button" onClick={onOpenOrders} type="button"><SvgIcon name="orders" />Create order</button>
        </div>
      </header>

      {demoMode ? <div className="console-banner" role="status"><SvgIcon name="alert" /><div><strong>Live services are unavailable</strong><span>Showing fallback data. Write actions remain disabled until the connection is restored.</span></div></div> : null}

      <div className="console-metric-grid" aria-label="Operational summary">
        {metrics.map((metric) => <button className={`console-metric-card ${metric.tone}`} key={metric.label} onClick={() => selectView(metric.view)} type="button"><span className="console-metric-label">{metric.label}<SvgIcon name="chevron" /></span><strong>{metric.value}</strong><span>{metric.detail}</span></button>)}
      </div>

      {paymentIssues > 0 ? <aside className="console-exception" aria-label="Active operational alert"><span className="console-alert-icon"><SvgIcon name="alert" /></span><div><span className="console-alert-kicker">Needs attention · Payment operations</span><strong>{paymentIssues} {paymentIssues === 1 ? "order has" : "orders have"} an unresolved payment exception</strong><p>Verify settlement or failure details before releasing affected orders to fulfilment.</p></div><button onClick={onOpenPayments} type="button">Review payments <SvgIcon name="chevron" /></button></aside> : null}

      <section className="console-workspace" aria-labelledby="queue-title">
        <div className="console-section-heading"><div><p className="eyebrow">Priority work queue</p><h3 id="queue-title">Orders requiring review</h3><p>{filteredQueue.length} {filteredQueue.length === 1 ? "result" : "results"} · sorted by {sort.key}</p></div><button className="console-secondary-button console-columns-button" type="button" title="Column visibility is optimised for this view"><SvgIcon name="columns" />Columns</button></div>

        <div className="console-saved-views" aria-label="Saved views">
          {savedViews.map((view) => <button aria-pressed={savedView === view.value} className={savedView === view.value ? "active" : ""} key={view.value} onClick={() => selectView(view.value)} type="button">{view.label}{view.value === "requires-action" ? <span>{requiresAction}</span> : null}</button>)}
        </div>

        <div className={`console-filter-bar ${showMobileFilters ? "filters-open" : ""}`}>
          <label className="console-search"><span className="sr-only">Search the work queue</span><SvgIcon name="search" /><input onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or issue" type="search" value={query} /></label>
          <button aria-expanded={showMobileFilters} className="console-mobile-filter-toggle" onClick={() => setShowMobileFilters((current) => !current)} type="button"><SvgIcon name="columns" />Filters{hasFilters ? <span aria-label="Filters applied">•</span> : null}</button>
          <label><span>Payment</span><select aria-label="Payment status" onChange={(event) => setPaymentFilter(event.target.value)} value={paymentFilter}><option value="all">All statuses</option><option>Failed</option><option>Pending</option><option>Captured</option><option>Refunded</option><option value="Not recorded">Not recorded</option></select></label>
          <label><span>Fulfilment</span><select aria-label="Fulfilment method" onChange={(event) => setMethodFilter(event.target.value)} value={methodFilter}><option value="all">All methods</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></label>
          <label><span>Priority</span><select aria-label="Priority" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}><option value="all">All priorities</option><option>High</option><option>Medium</option><option>Normal</option><option>Resolved</option></select></label>
          <label><span>Updated</span><select aria-label="Date range" onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}><option value="all">Any time</option><option value="today">Today</option><option value="7-days">Last 7 days</option><option value="30-days">Last 30 days</option></select></label>
          {hasFilters ? <button className="console-clear-filters" onClick={clearFilters} type="button">Clear all filters</button> : null}
        </div>

        {selectedIds.size > 0 ? <div className="console-bulk-bar" role="status"><strong>{selectedIds.size} selected</strong><span>Bulk actions apply only to the selected orders.</span><div><button onClick={onOpenOrders} type="button">Review selected</button><button onClick={() => setSelectedIds(new Set())} type="button">Clear selection</button></div></div> : null}

        <div className="console-table-wrap">
          <table className="console-table">
            <caption className="sr-only">Operational order work queue</caption>
            <thead><tr><th className="console-checkbox-cell" scope="col"><input aria-label="Select all visible orders" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (allVisibleSelected) filteredQueue.forEach((item) => next.delete(item.order.id)); else filteredQueue.forEach((item) => next.add(item.order.id)); return next; })} type="checkbox" /></th><th aria-sort={sortLabel("id")} scope="col"><button onClick={() => changeSort("id")} type="button">Order</button></th><th aria-sort={sortLabel("customer")} scope="col"><button onClick={() => changeSort("customer")} type="button">Customer</button></th><th scope="col">Channel</th><th aria-sort={sortLabel("value")} scope="col"><button onClick={() => changeSort("value")} type="button">Value</button></th><th scope="col">Payment</th><th scope="col">Fulfilment</th><th scope="col">Issue</th><th aria-sort={sortLabel("priority")} scope="col"><button onClick={() => changeSort("priority")} type="button">Priority</button></th><th scope="col">Assigned to</th><th aria-sort={sortLabel("updated")} scope="col"><button onClick={() => changeSort("updated")} type="button">Updated</button></th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredQueue.map((item) => <tr className={selectedIds.has(item.order.id) ? "selected" : ""} key={item.order.id}><td className="console-checkbox-cell"><input aria-label={`Select order ${item.order.id}`} checked={selectedIds.has(item.order.id)} onChange={() => toggleRow(item.order.id)} type="checkbox" /></td><td><button className="console-order-link" onClick={() => setDetailId(item.order.id)} type="button">#{item.order.id}</button><small>{formatOrderDate(item.order.created_at)}</small></td><td><strong>{item.order.customer_name}</strong><small>{item.order.customer_email}</small></td><td>Online store</td><td className="console-money">{currencyFromCents(item.order.subtotal_cents)}</td><td><span className={`console-status ${statusClass(item.paymentStatus)}`}>{item.paymentStatus}</span></td><td><span className="console-status neutral">{sentenceCase(item.order.fulfillment_status)}</span><small>{sentenceCase(item.order.fulfillment_method)}</small></td><td><span className="console-issue">{item.issue}</span></td><td><span className={`console-priority ${item.priority.toLowerCase()}`}><i />{item.priority}</span></td><td>{item.assignedTo}</td><td><span title={item.updatedAt}>{formatRelativeTime(item.updatedAt)}</span></td><td><button className="console-row-action" aria-label={`Open details for order ${item.order.id}`} onClick={() => setDetailId(item.order.id)} type="button"><SvgIcon name="chevron" /></button></td></tr>)}</tbody>
          </table>
          {filteredQueue.length === 0 ? <div className="console-empty"><span><SvgIcon name="search" /></span><h4>No matching orders</h4><p>Try another saved view or clear the filters to see more work.</p><button className="console-secondary-button" onClick={clearFilters} type="button">Clear all filters</button></div> : null}
        </div>

        <div className="console-mobile-list">{filteredQueue.map((item) => <article className="console-mobile-card" key={item.order.id}><header><label><input aria-label={`Select order ${item.order.id}`} checked={selectedIds.has(item.order.id)} onChange={() => toggleRow(item.order.id)} type="checkbox"/><button onClick={() => setDetailId(item.order.id)} type="button">#{item.order.id}</button></label><span className={`console-priority ${item.priority.toLowerCase()}`}><i />{item.priority}</span></header><strong>{item.order.customer_name}</strong><p>{item.issue}</p><div><span className={`console-status ${statusClass(item.paymentStatus)}`}>{item.paymentStatus}</span><span className="console-status neutral">{sentenceCase(item.order.fulfillment_status)}</span></div><footer><strong>{currencyFromCents(item.order.subtotal_cents)}</strong><button onClick={() => setDetailId(item.order.id)} type="button">View details <SvgIcon name="chevron" /></button></footer></article>)}</div>
      </section>

      <footer className="console-help" id="console-help"><SvgIcon name="help" /><div><strong>Need help with an exception?</strong><p>Open an order to see its timeline and recommended next action. Financial changes are completed in Payment management.</p></div></footer>

      {detailItem ? <div className="console-drawer-layer" role="presentation"><button aria-label="Close order details" className="console-drawer-scrim" onClick={() => setDetailId(null)} type="button"/><aside aria-labelledby="detail-title" aria-modal="true" className="console-drawer" role="dialog"><header><div><p className="eyebrow">Order #{detailItem.order.id}</p><h3 id="detail-title">{detailItem.order.customer_name}</h3><div><span className={`console-priority ${detailItem.priority.toLowerCase()}`}><i />{detailItem.priority}</span><span className={`console-status ${statusClass(detailItem.paymentStatus)}`}>{detailItem.paymentStatus}</span></div></div><button aria-label="Close order details" className="console-drawer-close" onClick={() => setDetailId(null)} ref={closeButtonRef} type="button"><SvgIcon name="close" /></button></header><div className="console-drawer-body"><section className="console-next-action"><span><SvgIcon name="alert" /></span><div><p className="eyebrow">Recommended next action</p><strong>{detailItem.paymentStatus === "Pending" ? "Confirm settlement before releasing fulfilment" : detailItem.paymentStatus === "Failed" || detailItem.paymentStatus === "Not recorded" ? "Review and resolve the payment exception" : detailItem.requiresAction ? "Review the current fulfilment stage" : "No urgent action is required"}</strong><p>{detailItem.issue}.</p></div></section><section><h4>Order summary</h4><dl className="console-detail-grid"><div><dt>Order value</dt><dd>{currencyFromCents(detailItem.order.subtotal_cents)}</dd></div><div><dt>Channel</dt><dd>Online store</dd></div><div><dt>Method</dt><dd>{sentenceCase(detailItem.order.fulfillment_method)}</dd></div><div><dt>Created</dt><dd>{formatOrderDate(detailItem.order.created_at)}</dd></div></dl><div className="console-line-items">{detailItem.order.items.map((item) => <div key={item.product_id}><span>{item.quantity}× {item.product_name}</span><strong>{currencyFromCents(item.unit_price_cents * item.quantity)}</strong></div>)}</div></section><section><h4>Customer</h4><div className="console-contact-card"><div><strong>{detailItem.order.customer_name}</strong><span>{detailItem.order.customer_email}</span></div><a href={`mailto:${detailItem.order.customer_email}`}>Contact customer</a></div></section><section><h4>Payment timeline</h4>{detailItem.payment ? <div className="console-timeline"><div><i /><strong>{detailItem.payment.status} · {detailItem.payment.method}</strong><span>{detailItem.payment.reference || "No provider reference"}</span><small>{formatOrderDate(detailItem.payment.updated_at)}</small></div></div> : <p className="console-muted-state">No payment has been recorded for this order.</p>}</section><section><h4>Fulfilment timeline</h4><div className="console-timeline">{detailItem.order.fulfillment_history.length ? detailItem.order.fulfillment_history.slice().reverse().map((event) => <div key={event.id}><i /><strong>{sentenceCase(event.to_status)}</strong><span>{event.note || "Status updated"}</span><small>{event.changed_by} · {formatOrderDate(event.happened_at)}</small></div>) : <div><i /><strong>Order received</strong><span>Waiting for the first fulfilment update.</span><small>{formatOrderDate(detailItem.order.created_at)}</small></div>}</div></section><section><h4>Relevant system events</h4><div className="console-event-list">{activity.slice(0, 3).map((item, index) => <div key={`${item.happened_at}-${index}`}><SvgIcon name="check"/><span>{item.detail}</span><small>{item.happened_at}</small></div>)}</div></section></div><footer><button className="console-secondary-button" onClick={onOpenPayments} type="button">Open payments</button><button className="console-primary-button" onClick={onOpenFulfillment} type="button">Update fulfilment</button></footer></aside></div> : null}
    </section>
  );
}
