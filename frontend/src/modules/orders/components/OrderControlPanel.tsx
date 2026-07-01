import { type FormEvent, useEffect, useState } from "react";

import { currencyFromCents, formatOrderDate } from "../../../shared/formatters";
import type { CreateOrderInput, Order } from "../types";
import type { Product } from "../../storefront/types";

type OrderFormLine = {
  key: string;
  product_id: string;
  quantity: string;
};

type OrderFormState = {
  customer_name: string;
  customer_email: string;
  items: OrderFormLine[];
};

type OrderControlPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  onCreateOrder: (input: CreateOrderInput) => Promise<Order>;
  onDeleteOrder: (orderId: number) => Promise<void>;
  onUpdateOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  orders: Order[];
  products: Product[];
};

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
    items: [newOrderLine(products[0]?.id ? String(products[0].id) : "")]
  };
}

function orderToForm(order: Order): OrderFormState {
  return {
    customer_name: order.customer_name,
    customer_email: order.customer_email,
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
    items
  };
}

export function OrderControlPanel({
  canCreate,
  canDelete,
  canUpdate,
  onCreateOrder,
  onDeleteOrder,
  onUpdateOrder,
  orders,
  products
}: OrderControlPanelProps) {
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => emptyOrderForm(products));
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const canSave = editingOrderId === null ? canCreate : canUpdate;
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
    setFeedback(null);
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
    setFeedback(null);
  };

  const handleSubmitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      setFeedback({ kind: "error", message: "The active role cannot save this order change." });
      return;
    }

    setFeedback(null);
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

      setFeedback({
        kind: "success",
        message:
          editingOrderId === null
            ? `Order #${order.id} was created.`
            : `Order #${order.id} was updated.`
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to save order."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!canDelete) {
      setFeedback({ kind: "error", message: "The active role cannot delete orders." });
      return;
    }

    const confirmed = window.confirm(`Delete order #${order.id}?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setDeletingOrderId(order.id);

    try {
      await onDeleteOrder(order.id);
      if (editingOrderId === order.id) {
        resetForm();
      }
      setFeedback({ kind: "success", message: `Order #${order.id} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete order."
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

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

      <div className="order-control-grid">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{editingOrderId === null ? "New order" : `Order #${editingOrderId}`}</p>
              <h3>{editingOrderId === null ? "Build customer order" : "Modify order"}</h3>
            </div>
            <span className={`status-pill ${canSave ? "live" : ""}`}>
              {canSave ? "Writable" : "Read only"}
            </span>
          </div>

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

            {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}

            <div className="form-actions split-actions">
              <button className="solid-button" disabled={!canSave || isSaving} type="submit">
                {isSaving ? "Saving..." : editingOrderId === null ? "Create Order" : "Save Order"}
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
              <p className="eyebrow">Order book</p>
              <h3>Recent checkout orders</h3>
            </div>
            <span className="status-pill">{orders.length} rows</span>
          </div>

          {orders.length === 0 ? (
            <p>No orders have been placed yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div className="order-row" key={order.id}>
                  <div className="order-row-top">
                    <div>
                      <p className="eyebrow">Order #{order.id}</p>
                      <h4>{order.customer_name}</h4>
                      <span>
                        {order.customer_email} &middot; {formatOrderDate(order.created_at)}
                      </span>
                    </div>
                    <strong>{currencyFromCents(order.subtotal_cents)}</strong>
                  </div>

                  <div className="order-items">
                    {order.items.map((item, index) => (
                      <span key={`${order.id}-${item.product_id}-${index}`}>
                        {item.product_name} &times; {item.quantity}
                      </span>
                    ))}
                  </div>

                  <div className="order-actions">
                    <button className="outline-button" disabled={!canUpdate} onClick={() => editOrder(order)}>
                      Edit
                    </button>
                    <button
                      className="outline-button danger-button"
                      disabled={!canDelete || deletingOrderId === order.id}
                      onClick={() => void handleDeleteOrder(order)}
                    >
                      {deletingOrderId === order.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
