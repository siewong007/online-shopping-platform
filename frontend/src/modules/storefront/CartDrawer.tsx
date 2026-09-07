import { type FormEvent, useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/LanguageContext";
import { quoteCheckout } from "../orders/api/orderApi";
import type { CheckoutQuote } from "../orders/types";
import { rememberPendingPayment } from "../payments/paymentReturn";
import { currencyFromCents } from "../../shared/formatters";
import { normalizeError } from "../../shared/notifications";
import type {
  CartItem,
  CreateOrderInput,
  FulfillmentMethod,
  Order,
  PaymentCheckout,
  ShippingAddressInput,
  ShippingOption
} from "../../types";
import type { PublicOffersPayload, Voucher } from "../offers/types";

import {
  CARD_PAY_ENABLED,
  DELIVERY_CHECKOUT_ENABLED,
  formatWorklistPrice,
  pickupWhatsAppHref,
  PURCHASE_ENABLED,
  WA_COUNTER
} from "./helpers";
import { isGenericPlaceholderImage } from "./listing";

const EMPTY_SHIPPING_ADDRESS: ShippingAddressInput = {
  recipient_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country_code: "MY"
};

function isShippingAddressComplete(address: ShippingAddressInput): boolean {
  return Boolean(
    address.recipient_name.trim() &&
      address.phone.trim() &&
      address.address_line1.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      address.postal_code.trim()
  );
}

type CartDrawerProps = {
  cart: CartItem[];
  customerAccountEmail: string;
  open: boolean;
  onCheckout: (input: CreateOrderInput) => Promise<PaymentCheckout>;
  onClose: () => void;
  onCompleted: () => void;
  onPromotionChange: (promotionId: number | null) => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onVoucherCodeChange: (code: string) => void;
  publicOffers: PublicOffersPayload | null;
  selectedPromotionId: number | null;
  voucherCode: string;
};

export function CartDrawer({
  cart,
  customerAccountEmail,
  open,
  onCheckout,
  onClose,
  onCompleted,
  onPromotionChange,
  onRemoveFromCart,
  onUpdateQuantity,
  onVoucherCodeChange,
  publicOffers,
  selectedPromotionId,
  voucherCode
}: CartDrawerProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<{
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    fulfillment_method: FulfillmentMethod;
    shipping_address: ShippingAddressInput;
    shipping_service_code: string;
  }>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    fulfillment_method: "pickup",
    shipping_address: EMPTY_SHIPPING_ADDRESS,
    shipping_service_code: ""
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteFeedback, setQuoteFeedback] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = () => {
    setStage("cart");
    setForm({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      fulfillment_method: "pickup",
      shipping_address: EMPTY_SHIPPING_ADDRESS,
      shipping_service_code: ""
    });
    setFeedback(null);
    setRedirectingToPayment(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const email = customerAccountEmail.trim();
    if (!email) {
      return;
    }

    setForm((current) => {
      if (current.customer_email.trim()) {
        return current;
      }

      return { ...current, customer_email: email };
    });
  }, [customerAccountEmail, open]);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      drawer ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)) : [];

    (focusableElements()[0] ?? drawer)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;
      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (openerRef.current?.isConnected) openerRef.current.focus();
      openerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer || drawer.contains(document.activeElement)) return;

    drawer
      .querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      ?.focus();
  }, [cart, open]);

  const isDelivery = form.fulfillment_method === "delivery";
  const addressReady = !isDelivery || isShippingAddressComplete(form.shipping_address);

  useEffect(() => {
    if (!open || cart.length === 0 || !addressReady) {
      setQuote(null);
      setQuoteFeedback(null);
      setIsQuoting(false);
      return;
    }

    let cancelled = false;
    setQuote(null);
    setQuoteFeedback(null);
    setIsQuoting(true);

    const timeout = window.setTimeout(() => {
      void quoteCheckout({
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        fulfillment_method: form.fulfillment_method,
        promotion_id: selectedPromotionId ?? undefined,
        voucher_code: voucherCode.trim() || undefined,
        shipping_address: isDelivery ? form.shipping_address : undefined,
        shipping_service_code: isDelivery ? form.shipping_service_code || undefined : undefined
      })
        .then((nextQuote) => {
          if (cancelled) return;
          setQuote(nextQuote);
          if (isDelivery && !form.shipping_service_code && nextQuote.shipping_options.length > 0) {
            setForm((current) => ({
              ...current,
              shipping_service_code: nextQuote.shipping_options[0].code
            }));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setQuoteFeedback(
              normalizeError(error, {
                operation: "calculate checkout total",
                scope: "checkout"
              }).userMessage
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsQuoting(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    addressReady,
    cart,
    isDelivery,
    open,
    selectedPromotionId,
    voucherCode,
    form.fulfillment_method,
    form.shipping_address,
    form.shipping_service_code
  ]);

  if (!open) {
    return null;
  }

  const subtotalCents = cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);
  const eligiblePromotions =
    publicOffers?.promotions.filter(
      (promotion) => subtotalCents >= promotion.minimum_subtotal_cents
    ) ?? [];
  const eligibleVouchers =
    publicOffers?.vouchers.filter((voucher) => subtotalCents >= voucher.minimum_subtotal_cents) ?? [];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    if (!PURCHASE_ENABLED) {
      setIsSubmitting(false);
      return;
    }

    if (!CARD_PAY_ENABLED) {
      window.open(
        pickupWhatsAppHref(cart, form.customer_name, form.customer_phone, form.customer_email),
        "_blank",
        "noopener"
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const checkout = await onCheckout({
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        fulfillment_method: DELIVERY_CHECKOUT_ENABLED ? form.fulfillment_method : "pickup",
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        promotion_id: selectedPromotionId ?? undefined,
        voucher_code: voucherCode.trim() || undefined,
        shipping_address: isDelivery ? form.shipping_address : undefined,
        shipping_service_code: isDelivery ? form.shipping_service_code || undefined : undefined
      });
      try {
        rememberPendingPayment(window.sessionStorage, {
          orderId: checkout.order.id,
          provider: checkout.provider
        });
      } catch {
        // The hosted checkout still works when session storage is unavailable.
      }
      onCompleted();
      setRedirectingToPayment(true);
      window.location.assign(checkout.payment_url);
    } catch (error) {
      setFeedback(normalizeError(error, { operation: "checkout", scope: "checkout" }).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  let title = t("shop.cartd.title");
  if (redirectingToPayment) {
    title = "Secure payment";
  } else if (stage === "checkout") {
    title = "Checkout";
  }

  const renderTotals = () => {
    const formatCartPrice = stage === "cart" ? formatWorklistPrice : currencyFromCents;

    if (!quote) {
      return (
        <div className="cart-subtotal">
          <span>{t("shop.cartd.subtotal")}</span>
          <strong>{formatCartPrice(subtotalCents)}</strong>
        </div>
      );
    }

    return (
      <>
        <div className="cart-subtotal">
          <span>Subtotal</span>
          <strong>{formatCartPrice(quote.subtotal_cents)}</strong>
        </div>
        {quote.discount_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>Discount</span>
            <strong>-{formatCartPrice(quote.discount_cents)}</strong>
          </div>
        ) : null}
        {quote.tax_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>Tax</span>
            <strong>{formatCartPrice(quote.tax_cents)}</strong>
          </div>
        ) : null}
        {quote.shipping_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>Shipping</span>
            <strong>{formatCartPrice(quote.shipping_cents)}</strong>
          </div>
        ) : null}
        <div className="cart-subtotal">
          <span>Total</span>
          <strong>{formatCartPrice(quote.total_cents)}</strong>
        </div>
      </>
    );
  };

  return (
    <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="cart-scrim" aria-label={t("shop.cartd.close")} onClick={close} />
      <aside className="cart-drawer" ref={drawerRef} tabIndex={-1}>
        <header className="cart-drawer-head">
          <h2>{title}</h2>
          <button className="cart-close" onClick={close} aria-label="Close cart">
            &times;
          </button>
        </header>

        {redirectingToPayment ? (
          <div className="cart-confirmation">
            <p className="cart-confirm-badge">Redirecting</p>
            <p>Please wait while we open the secure payment page.</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty">
            <p>{t("shop.cartd.empty")}</p>
            <button className="outline-button" onClick={close}>
              Browse products
            </button>
          </div>
        ) : stage === "cart" ? (
          <>
            <ul className="cart-lines">
              {cart.map((item) => {
                const showCartImage = !isGenericPlaceholderImage(item.product.image_url);

                return (
                  <li className="cart-line" key={item.product.id}>
                    <div className={"cart-line-visual" + (showCartImage ? "" : " tone-fallback")}>
                      {showCartImage ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const parent = event.currentTarget.parentElement;
                          if (parent) parent.classList.add("tone-fallback");
                        }}
                      />
                      ) : null}
                    </div>
                    <div className="cart-line-body">
                      <div className="cart-line-info">
                        <strong>{item.product.name}</strong>
                        <span>{formatWorklistPrice(item.product.price_cents)} each</span>
                      </div>
                      <div className="cart-line-controls">
                        <div className="qty-stepper">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            aria-label={`Decrease ${item.product.name} quantity`}
                          >
                            &minus;
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            disabled={item.quantity >= item.product.stock_quantity}
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            aria-label={`Increase ${item.product.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                        <strong>{formatWorklistPrice(item.product.price_cents * item.quantity)}</strong>
                        <button className="cart-remove" onClick={() => onRemoveFromCart(item.product.id)}>
                          {t("shop.cartd.remove")}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <section className="cart-checkout-form" aria-labelledby="cart-deals-title">
              <h3 id="cart-deals-title">Deals &amp; vouchers</h3>
              <label>
                <span>{t("shop.checkout.promotion")}</span>
                <select
                  aria-label="Select a promotion"
                  onChange={(event) =>
                    onPromotionChange(event.target.value ? Number(event.target.value) : null)
                  }
                  value={selectedPromotionId ?? ""}
                >
                  <option value="">No promotion</option>
                  {eligiblePromotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.label}: {promotion.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPromotionId !== null ? (
                <button
                  className="outline-button"
                  onClick={() => onPromotionChange(null)}
                  type="button"
                >
                  Remove selected promotion
                </button>
              ) : null}
              <label>
                <span>{t("shop.checkout.voucherCode")}</span>
                <input
                  aria-label="Voucher code"
                  onChange={(event) => onVoucherCodeChange(event.target.value)}
                  placeholder="Enter voucher code"
                  value={voucherCode}
                />
              </label>
              {voucherCode.trim() ? (
                <button
                  className="outline-button"
                  onClick={() => onVoucherCodeChange("")}
                  type="button"
                >
                  Remove voucher
                </button>
              ) : null}
              {eligibleVouchers.length ? (
                <div>
                  <strong>Public vouchers</strong>
                  <div className="cart-checkout-actions">
                    {eligibleVouchers.map((voucher) => (
                      <button
                        aria-label={`Apply public voucher ${voucher.code}`}
                        className="outline-button"
                        disabled={isQuoting}
                        key={voucher.id}
                        onClick={() => onVoucherCodeChange(voucher.code)}
                        type="button"
                      >
                        Apply {voucher.code}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {isQuoting ? <p className="cart-feedback">Updating checkout total…</p> : null}
              {quoteFeedback ? (
                <p className="cart-feedback" role="alert">
                  {quoteFeedback}
                </p>
              ) : null}
            </section>
            <footer className="cart-drawer-foot">
              {renderTotals()}
              {PURCHASE_ENABLED ? (
              <button
                className="solid-button"
                disabled={isQuoting}
                onClick={() => setStage("checkout")}
              >
                Proceed to Checkout
              </button>
              ) : (
              <>
                <p className="cart-feedback" role="status">{t("shop.cartd.buyingPaused")}</p>
                <a className="solid-button" href={WA_COUNTER} rel="noopener" target="_blank">
                  {t("shop.cartd.sendWhatsapp")}
                </a>
              </>
              )}
            </footer>
          </>
        ) : (
          <form className="cart-checkout-form" onSubmit={handleSubmit}>
            <label>
              <span>{t("shop.checkout.fullName")}</span>
              <input
                value={form.customer_name}
                onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>{t("shop.checkout.email")}</span>
              <input
                type="email"
                value={form.customer_email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>{t("shop.checkout.phone")}</span>
              <input
                type="tel"
                value={form.customer_phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_phone: event.target.value }))
                }
                required
              />
            </label>
            {DELIVERY_CHECKOUT_ENABLED ? (
              <label>
                <span>{t("shop.checkout.fulfillment")}</span>
                <select
                  value={form.fulfillment_method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fulfillment_method: event.target.value as FulfillmentMethod,
                      shipping_service_code: ""
                    }))
                  }
                >
                  <option value="pickup">{t("shop.checkout.pickup")}</option>
                  <option value="delivery">{t("shop.checkout.delivery")}</option>
                </select>
              </label>
            ) : (
              <div className="cart-shipping-note" role="note">
                <strong>Free pickup from the Salim store</strong>
                <p>Online delivery is not enabled yet. For a delivery quote, WhatsApp +60 17-405 6993 before ordering.</p>
              </div>
            )}
            {isDelivery ? (
              <div className="cart-shipping-fields">
                <p className="cart-shipping-note">{t("shop.checkout.deliveryNote")}</p>
                <label>
                  <span>{t("shop.checkout.recipientName")}</span>
                  <input
                    value={form.shipping_address.recipient_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, recipient_name: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.phone")}</span>
                  <input
                    type="tel"
                    value={form.shipping_address.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, phone: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.address1")}</span>
                  <input
                    value={form.shipping_address.address_line1}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, address_line1: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.address2")}</span>
                  <input
                    value={form.shipping_address.address_line2}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, address_line2: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.city")}</span>
                  <input
                    value={form.shipping_address.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, city: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.state")}</span>
                  <input
                    value={form.shipping_address.state}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, state: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>{t("shop.checkout.postalCode")}</span>
                  <input
                    value={form.shipping_address.postal_code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shipping_address: { ...current.shipping_address, postal_code: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                {quote && quote.shipping_options.length > 0 ? (
                  <label>
                    <span>{t("shop.checkout.deliveryService")}</span>
                    <select
                      value={form.shipping_service_code}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, shipping_service_code: event.target.value }))
                      }
                    >
                      {quote.shipping_options.map((option: ShippingOption) => (
                        <option key={option.code} value={option.code}>
                          {option.name} &middot; {currencyFromCents(option.shipping_cents)} &middot;{" "}
                          {option.min_delivery_days}-{option.max_delivery_days} days
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
            {feedback ? (
              <p className="cart-feedback" role="alert">
                {feedback}
              </p>
            ) : null}
            {isQuoting ? <p className="cart-feedback">Updating checkout total…</p> : null}
            {quoteFeedback ? (
              <p className="cart-feedback" role="alert">
                {quoteFeedback}
              </p>
            ) : null}
            {renderTotals()}
            {!CARD_PAY_ENABLED ? (
              <p className="cart-feedback" role="status">
                {t("shop.cartd.buyingPaused")}
              </p>
            ) : null}
            <div className="cart-checkout-actions">
              <button type="button" className="outline-button" onClick={() => setStage("cart")}>
                Back to cart
              </button>
              <button
                type="submit"
                className="solid-button"
                disabled={
                  isSubmitting || isQuoting || (isDelivery && (!addressReady || !form.shipping_service_code))
                }
              >
                {CARD_PAY_ENABLED
                  ? isSubmitting
                    ? "Placing order..."
                    : "Place Order"
                  : t("shop.cartd.sendWhatsapp")}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
