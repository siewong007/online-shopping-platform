import { type FormEvent, useEffect, useState } from "react";

import { ManagementTable } from "../../../shared/components/ManagementTable";
import { RecordModal } from "../../../shared/components/RecordModal";
import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import type {
  CreateOrderInput,
  FulfillmentMethod,
  FulfillmentStatus,
  Order,
  UpdateOrderFulfillmentInput
} from "../types";
import type { Product } from "../../storefront/types";

type OrderFormLine = {
  key: string;
  product_id: string;
  quantity: string;
};

type OrderFormState = {
  customer_name: string;
  customer_email: string;
  fulfillment_method: FulfillmentMethod;
  items: OrderFormLine[];
};

type OrderControlPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onCreateOrder: (input: CreateOrderInput) => Promise<Order>;
  onDeleteOrder: (orderId: number) => Promise<void>;
  onLoadMore: () => void;
  onUpdateOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  onUpdateFulfillment: (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ) => Promise<Order>;
  orders: Order[];
  products: Product[];
};

// Mirrors FULFILLMENT_PICKUP_TRANSITIONS / FULFILLMENT_DELIVERY_TRANSITIONS in
// backend/src/db/orders.rs — the backend is authoritative and re-validates on submit; this
// copy only limits which options the "Advance" modal offers.
const fulfillmentTransitions: Record<
  FulfillmentMethod,
  Record<FulfillmentStatus, FulfillmentStatus[]>
> = {
  pickup: {
    received: ["picking", "canceled"],
    picking: ["packed", "canceled"],
    packed: ["ready_for_pickup", "canceled"],
    ready_for_pickup: ["completed", "canceled"],
    out_for_delivery: [],
    completed: [],
    delivered: [],
    canceled: []
  },
  delivery: {
    received: ["picking", "canceled"],
    picking: ["packed", "canceled"],
    packed: ["out_for_delivery", "canceled"],
    ready_for_pickup: [],
    out_for_delivery: ["delivered", "canceled"],
    completed: [],
    delivered: [],
    canceled: []
  }
};

function fulfillmentLabel(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function fulfillmentTone(status: FulfillmentStatus): string {
  if (status === "completed" || status === "delivered") {
    return "live";
  }

  if (status === "canceled") {
    return "danger";
  }

  if (status === "packed" || status === "ready_for_pickup" || status === "out_for_delivery") {
    return "warning";
  }

  return "";
}

function nextFulfillmentStatuses(order: Order): FulfillmentStatus[] {
  return fulfillmentTransitions[order.fulfillment_method]?.[order.fulfillment_status] ?? [];
}

function newOrderLine(productId: string, quantity = 1): OrderFormLine {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: productId,
    quantity: String(quantity)
  };
}

function emptyOrderForm(products: Product[]): OrderFormState {
  return {
    customer_name: "",
    customer_email: "",
    fulfillment_method: "pickup",
    items: [newOrderLine(products[0]?.id ? String(products[0].id) : "")]
  };
}

function orderToForm(order: Order): OrderFormState {
  return {
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    fulfillment_method: order.fulfillment_method,
    items: order.items.map((item) => newOrderLine(String(item.product_id), item.quantity))
  };
}

function normalizeOrderForm(form: OrderFormState): CreateOrderInput {
  const items = form.items.map((item) => {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("Select a product for every order line.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Each order line quantity must be a whole number above zero.");
    }

    return { product_id: productId, quantity };
  });

  return {
    customer_name: form.customer_name.trim(),
    customer_email: form.customer_email.trim(),
    fulfillment_method: form.fulfillment_method,
    items
  };
}

export function OrderControlPanel({
  canCreate,
  canDelete,
  canUpdate,
  hasMore,
  isLoadingMore,
  onCreateOrder,
  onDeleteOrder,
  onLoadMore,
  onUpdateOrder,
  onUpdateFulfillment,
  orders,
  products
}: OrderControlPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => emptyOrderForm(products));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [fulfillmentOrderId, setFulfillmentOrderId] = useState<number | null>(null);
  const [fulfillmentDraft, setFulfillmentDraft] = useState<{
    to_status: FulfillmentStatus;
    note: string;
  }>({ to_status: "picking", note: "" });
  const [savingFulfillmentId, setSavingFulfillmentId] = useState<number | null>(null);
  const [historyOrderId, setHistoryOrderId] = useState<number | null>(null);
  const canSave = editingOrderId === null ? canCreate : canUpdate;
  const fulfillmentOrder =
    fulfillmentOrderId === null
      ? null
      : orders.find((order) => order.id === fulfillmentOrderId) ?? null;
  const fulfillmentNextStatuses = fulfillmentOrder
    ? nextFulfillmentStatuses(fulfillmentOrder)
    : [];
  const historyOrder =
    historyOrderId === null ? null : orders.find((order) => order.id === historyOrderId) ?? null;
  const previewSubtotal = form.items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === Number(item.product_id));
    const quantity = Number(item.quantity);
    return product && Number.isFinite(quantity) ? sum + product.price_cents * quantity : sum;
  }, 0);

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    setForm((current) => {
      const hasMissingProduct = current.items.some((item) => item.product_id === "");
      return hasMissingProduct
        ? {
            ...current,
            items: current.items.map((item) =>
              item.product_id === "" ? { ...item, product_id: String(products[0].id) } : item
            )
          }
        : current;
    });
  }, [products]);

  const resetForm = () => {
    setEditingOrderId(null);
    setForm(emptyOrderForm(products));
    setIsEditorOpen(false);
  };

  const updateLine = (lineKey: string, patch: Partial<OrderFormLine>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === lineKey ? { ...item, ...patch } : item))
    }));
  };

  const removeLine = (lineKey: string) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.key !== lineKey)
    }));
  };

  const editOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setForm(orderToForm(order));
    setIsEditorOpen(true);
  };

  const createOrder = () => {
    setEditingOrderId(null);
    setForm(emptyOrderForm(products));
    setIsEditorOpen(true);
  };

  const openFulfillmentEditor = (order: Order) => {
    const nextStatuses = nextFulfillmentStatuses(order);

    if (nextStatuses.length === 0) {
      notify({ severity: "info", title: "Order already final", message: `Order #${order.id} is already in a final state, so no fulfillment change is needed.`, scope: "orders", dedupeKey: `orders:${order.id}:final` });
      return;
    }

    setFulfillmentOrderId(order.id);
    setFulfillmentDraft({ to_status: nextStatuses[0], note: "" });
  };

  const closeFulfillmentEditor = () => {
    setFulfillmentOrderId(null);
    setFulfillmentDraft({ to_status: "picking", note: "" });
  };

  const handleSubmitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      notify({ severity: "error", title: "Order not saved", message: "The active role cannot save this order change.", scope: "orders", dedupeKey: "orders:save:permission" });
      return;
    }

    const wasCreating = editingOrderId === null;
    setIsSaving(true);

    try {
      const payload = normalizeOrderForm(form);
      const order =
        editingOrderId === null
          ? await onCreateOrder(payload)
          : await onUpdateOrder(editingOrderId, payload);

      if (editingOrderId === null) {
        setForm(emptyOrderForm(products));
      } else {
        setForm(orderToForm(order));
      }

      setIsEditorOpen(false);
      setEditingOrderId(null);
      notify({ severity: "success", title: wasCreating ? "Order created" : "Order updated", message: `Order #${order.id} was ${wasCreating ? "created" : "updated"} successfully.`, scope: "orders", dedupeKey: `orders:${order.id}:${wasCreating ? "create" : "update"}:success` });
    } catch (error) {
      notifyError(error, { operation: wasCreating ? "create order" : "update order", scope: "orders", dedupeKey: `orders:${editingOrderId ?? "new"}:save:error` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFulfillment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fulfillmentOrder || !canUpdate) {
      notify({ severity: "error", title: "Fulfillment not changed", message: "The active role cannot change fulfillment status.", scope: "orders", dedupeKey: "orders:fulfillment:permission" });
      return;
    }

    setSavingFulfillmentId(fulfillmentOrder.id);

    try {
      const updated = await onUpdateFulfillment(fulfillmentOrder.id, {
        to_status: fulfillmentDraft.to_status,
        note: fulfillmentDraft.note.trim()
      });

      setHistoryOrderId(updated.id);
      setFulfillmentOrderId(null);
      notify({ severity: "success", title: "Fulfillment updated", message: `Order #${updated.id} was moved to ${fulfillmentLabel(updated.fulfillment_status)} successfully.`, scope: "orders", dedupeKey: `orders:${updated.id}:fulfillment:success` });
    } catch (error) {
      notifyError(error, { operation: "update order fulfillment", scope: "orders", dedupeKey: `orders:${fulfillmentOrder.id}:fulfillment:error` });
    } finally {
      setSavingFulfillmentId(null);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!canDelete) {
      notify({ severity: "error", title: "Order not deleted", message: "The active role cannot delete orders.", scope: "orders", dedupeKey: "orders:delete:permission" });
      return;
    }

    const confirmed = window.confirm(`Delete order #${order.id}?`);
    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);

    try {
      await onDeleteOrder(order.id);
      if (editingOrderId === order.id) {
        resetForm();
      }
      notify({ severity: "success", title: "Order deleted", message: `Order #${order.id} was deleted successfully.`, scope: "orders", dedupeKey: `orders:${order.id}:delete:success` });
    } catch (error) {
      notifyError(error, { operation: "delete order", scope: "orders", dedupeKey: `orders:${order.id}:delete:error` });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const orderColumns = [
    {
      key: "id",
      label: "Order",
      align: "right" as const,
      sortValue: (order: Order) => order.id,
      render: (order: Order) => `#${order.id}`
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (order: Order) => order.customer_name,
      render: (order: Order) => (
        <div className="table-cell-main">
          <strong>{order.customer_name}</strong>
          <span>{order.customer_email}</span>
        </div>
      )
    },
    {
      key: "items",
      label: "Items",
      sortValue: (order: Order) =>
        order.items.reduce((sum, item) => sum + item.quantity, 0),
      render: (order: Order) => (
        <div className="table-cell-list">
          {order.items.map((item, index) => (
            <span key={`${order.id}-${item.product_id}-${index}`}>
              {item.product_name} x {item.quantity}
            </span>
          ))}
        </div>
      )
    },
    {
      key: "subtotal",
      label: "Total",
      align: "right" as const,
      sortValue: (order: Order) => order.subtotal_cents,
      render: (order: Order) => currencyFromCents(order.subtotal_cents)
    },
    {
      key: "fulfillment",
      label: "Fulfillment",
      sortValue: (order: Order) => `${order.fulfillment_status}-${order.fulfillment_method}`,
      render: (order: Order) => (
        <div className="table-cell-main">
          <span className={`status-pill ${fulfillmentTone(order.fulfillment_status)}`}>
            {fulfillmentLabel(order.fulfillment_status)}
          </span>
          <span>{fulfillmentLabel(order.fulfillment_method)}</span>
        </div>
      )
    },
    {
      key: "created",
      label: "Created",
      sortValue: (order: Order) => order.created_at,
      render: (order: Order) => formatOrderDate(order.created_at)
    },
    {
      key: "actions",
      label: "Actions",
      render: (order: Order) => (
        <div className="management-action-stack">
          <button
            className="solid-button table-action"
            disabled={!canUpdate || nextFulfillmentStatuses(order).length === 0}
            onClick={() => openFulfillmentEditor(order)}
            type="button"
          >
            Advance
          </button>
          <button
            className="outline-button table-action"
            onClick={() =>
              setHistoryOrderId((current) => (current === order.id ? null : order.id))
            }
            type="button"
          >
            {historyOrderId === order.id ? "Hide History" : "History"}
          </button>
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => editOrder(order)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button danger-button table-action"
            disabled={!canDelete || deletingOrderId === order.id}
            onClick={() => void handleDeleteOrder(order)}
            type="button"
          >
            {deletingOrderId === order.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Order control</p>
          <h3>Create, edit and remove checkout orders</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
          {orders.length} total
        </span>
      </div>

      <article className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Order book</p>
            <h3>Recent checkout orders</h3>
          </div>
          <div className="admin-actions">
            <span className="status-pill">{orders.length} rows</span>
            <button className="solid-button" disabled={!canCreate} onClick={createOrder} type="button">
              Create Order
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <p>No orders have been placed yet.</p>
        ) : (
          <ManagementTable
            columns={orderColumns}
            emptyMessage="No orders have been placed yet."
            getRowKey={(order) => order.id}
            hasMore={hasMore}
            initialSortDirection="desc"
            initialSortKey="id"
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
            rows={orders}
            tableLabel="Order management table"
          />
        )}

        {historyOrder ? (
          <div className="order-history-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Fulfillment history</p>
                <h3>Order #{historyOrder.id}</h3>
              </div>
              <button
                className="outline-button"
                onClick={() => setHistoryOrderId(null)}
                type="button"
              >
                Close
              </button>
            </div>
            {historyOrder.fulfillment_history.length === 0 ? (
              <p>No fulfillment transitions have been recorded yet.</p>
            ) : (
              <div className="order-history-list">
                {historyOrder.fulfillment_history.map((entry) => (
                  <div className="order-history-item" key={entry.id}>
                    <span>
                      {entry.from_status ? fulfillmentLabel(entry.from_status) : "New"} to{" "}
                      {fulfillmentLabel(entry.to_status)}
                    </span>
                    <strong>{entry.changed_by}</strong>
                    <small>{formatOrderDate(entry.happened_at)}</small>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </article>

      <RecordModal
        eyebrow={editingOrderId === null ? "New order" : `Order #${editingOrderId}`}
        isOpen={isEditorOpen}
        onClose={resetForm}
        size="wide"
        statusLabel={canSave ? "Writable" : "Read only"}
        statusTone={canSave ? "live" : undefined}
        title={editingOrderId === null ? "Build customer order" : "Modify order"}
      >
        <form className="admin-form" onSubmit={handleSubmitOrder}>
          <div className="admin-form-grid">
            <label className="admin-field">
              Customer name
              <input
                disabled={!canSave}
                value={form.customer_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_name: event.target.value }))
                }
                required
              />
            </label>

            <label className="admin-field">
              Customer email
              <input
                disabled={!canSave}
                type="email"
                value={form.customer_email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_email: event.target.value }))
                }
                required
              />
            </label>

            <label className="admin-field">
              Fulfillment method
              <select
                disabled={!canSave}
                value={form.fulfillment_method}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fulfillment_method: event.target.value as FulfillmentMethod
                  }))
                }
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
          </div>

          <div className="order-line-editor">
            {form.items.map((item, index) => (
              <div className="order-line-row" key={item.key}>
                <label className="admin-field">
                  Item {index + 1}
                  <select
                    disabled={!canSave}
                    value={item.product_id}
                    onChange={(event) => updateLine(item.key, { product_id: event.target.value })}
                    required
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  Qty
                  <input
                    disabled={!canSave}
                    min="1"
                    step="1"
                    type="number"
                    value={item.quantity}
                    onChange={(event) => updateLine(item.key, { quantity: event.target.value })}
                    required
                  />
                </label>

                <button
                  className="outline-button"
                  disabled={!canSave || form.items.length === 1}
                  onClick={() => removeLine(item.key)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="order-form-footer">
            <button
              className="outline-button"
              disabled={!canSave}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    newOrderLine(products[0]?.id ? String(products[0].id) : "")
                  ]
                }))
              }
              type="button"
            >
              Add Item
            </button>
            <strong>{currencyFromCents(previewSubtotal)}</strong>
          </div>

          <div className="form-actions split-actions">
            <button className="solid-button" disabled={!canSave || isSaving} type="submit">
              {isSaving ? "Saving..." : editingOrderId === null ? "Create Order" : "Save Order"}
            </button>
            <button className="outline-button" disabled={isSaving} onClick={resetForm} type="button">
              Cancel
            </button>
          </div>
        </form>
      </RecordModal>

      <RecordModal
        eyebrow={fulfillmentOrder ? `Order #${fulfillmentOrder.id}` : "Fulfillment"}
        isOpen={Boolean(fulfillmentOrder)}
        onClose={closeFulfillmentEditor}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title="Advance fulfillment"
      >
        {fulfillmentOrder ? (
          <form className="admin-form" onSubmit={handleSubmitFulfillment}>
            <div className="order-status-summary">
              <span className={`status-pill ${fulfillmentTone(fulfillmentOrder.fulfillment_status)}`}>
                {fulfillmentLabel(fulfillmentOrder.fulfillment_status)}
              </span>
              <strong>{fulfillmentLabel(fulfillmentOrder.fulfillment_method)}</strong>
            </div>

            <label className="admin-field">
              Move to
              <select
                disabled={!canUpdate}
                value={fulfillmentDraft.to_status}
                onChange={(event) =>
                  setFulfillmentDraft((current) => ({
                    ...current,
                    to_status: event.target.value as FulfillmentStatus
                  }))
                }
              >
                {fulfillmentNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {fulfillmentLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              Note
              <textarea
                disabled={!canUpdate}
                onChange={(event) =>
                  setFulfillmentDraft((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Optional handoff note"
                rows={3}
                value={fulfillmentDraft.note}
              />
            </label>

            <div className="form-actions split-actions">
              <button
                className="solid-button"
                disabled={
                  !canUpdate ||
                  fulfillmentNextStatuses.length === 0 ||
                  savingFulfillmentId === fulfillmentOrder.id
                }
                type="submit"
              >
                {savingFulfillmentId === fulfillmentOrder.id ? "Saving..." : "Advance Status"}
              </button>
              <button
                className="outline-button"
                disabled={savingFulfillmentId === fulfillmentOrder.id}
                onClick={closeFulfillmentEditor}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </RecordModal>
    </section>
  );
}
