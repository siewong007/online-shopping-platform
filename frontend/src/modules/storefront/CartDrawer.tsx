import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { useI18n } from "../../i18n/LanguageContext";
import { quoteCheckout } from "../orders/api/orderApi";
import type { CheckoutQuote } from "../orders/types";
import { rememberPendingPayment } from "../payments/paymentReturn";
import { TurnstileSlot, useTurnstile } from "../../shared/components/TurnstileSlot";
import { currencyFromCents } from "../../shared/formatters";
import { normalizeError } from "../../shared/notifications";
import type {
  CartItem,
  CreateOrderInput,
  FulfillmentMethod,
  PaymentCheckout,
  Product,
  ShippingAddressInput,
  ShippingOption
} from "../../types";
import type { PublicOffersPayload } from "../offers/types";

import {
  CARD_PAY_ENABLED,
  DELIVERY_CHECKOUT_ENABLED,
  isGenericPlaceholderImage,
  pickupWhatsAppHref,
  PURCHASE_ENABLED,
  WA_COUNTER
} from "./helpers";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const CHECKOUT_DRAFT_STORAGE_KEY = "ekoway_checkout_draft_v1";

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

type CheckoutDraftForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_method: FulfillmentMethod;
  shipping_address: ShippingAddressInput;
  shipping_service_code: string;
};

const EMPTY_CHECKOUT_FORM: CheckoutDraftForm = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  fulfillment_method: "pickup",
  shipping_address: EMPTY_SHIPPING_ADDRESS,
  shipping_service_code: ""
};

function readCheckoutDraft(): CheckoutDraftForm {
  if (typeof window === "undefined") return EMPTY_CHECKOUT_FORM;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) return EMPTY_CHECKOUT_FORM;
    const parsed = JSON.parse(raw) as Partial<CheckoutDraftForm>;
    const rawShipping = parsed.shipping_address;
    return {
      customer_name: typeof parsed.customer_name === "string" ? parsed.customer_name : "",
      customer_email: typeof parsed.customer_email === "string" ? parsed.customer_email : "",
      customer_phone: typeof parsed.customer_phone === "string" ? parsed.customer_phone : "",
      fulfillment_method:
        DELIVERY_CHECKOUT_ENABLED && parsed.fulfillment_method === "delivery"
          ? "delivery"
          : "pickup",
      shipping_service_code:
        typeof parsed.shipping_service_code === "string" ? parsed.shipping_service_code : "",
      shipping_address: {
        ...EMPTY_SHIPPING_ADDRESS,
        ...(rawShipping && typeof rawShipping === "object" ? rawShipping : {})
      }
    };
  } catch {
    return EMPTY_CHECKOUT_FORM;
  }
}

function clearCheckoutDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  } catch {
    // Session storage may be unavailable in restricted contexts.
  }
}

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

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (element.closest('[hidden], [aria-hidden="true"]')) {
        return false;
      }

      const closedDetails = element.closest("details:not([open])");
      if (closedDetails) {
        const summary = closedDetails.querySelector(":scope > summary");
        if (!summary || !summary.contains(element)) {
          return false;
        }
      }

      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    }
  );
}

type CartDrawerProps = {
  cart: CartItem[];
  customerAccountEmail: string;
  open: boolean;
  onAddToCart?: (product: Product) => void;
  onCheckout: (input: CreateOrderInput, turnstileToken: string | null) => Promise<PaymentCheckout>;
  onClearRecentlyViewed?: () => void;
  onClose: () => void;
  onCompleted: () => void;
  onPromotionChange: (promotionId: number | null) => void;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onViewProduct?: (productId: number) => void;
  onVoucherCodeChange: (code: string) => void;
  publicOffers: PublicOffersPayload | null;
  recentlyViewed?: Product[];
  selectedPromotionId: number | null;
  voucherCode: string;
};

export function CartDrawer({
  cart,
  customerAccountEmail,
  open,
  onAddToCart,
  onCheckout,
  onClearRecentlyViewed,
  onClose,
  onCompleted,
  onPromotionChange,
  onRemoveFromCart,
  onUpdateQuantity,
  onViewProduct,
  onVoucherCodeChange,
  publicOffers,
  recentlyViewed = [],
  selectedPromotionId,
  voucherCode
}: CartDrawerProps) {
  const { t } = useI18n();
  const checkoutFormId = useId();
  const [stage, setStage] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<CheckoutDraftForm>(readCheckoutDraft);
  const [voucherDraft, setVoucherDraft] = useState(voucherCode);
  const hasPublicOffers = Boolean(
    publicOffers && (publicOffers.promotions.length > 0 || publicOffers.vouchers.length > 0)
  );
  const [offersOpen, setOffersOpen] = useState(
    Boolean(selectedPromotionId || voucherCode.trim() || hasPublicOffers)
  );
  const [failedImageIds, setFailedImageIds] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteFeedback, setQuoteFeedback] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteRetryNonce, setQuoteRetryNonce] = useState(0);
  const drawerRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [didAutoExpandOffers, setDidAutoExpandOffers] = useState(hasPublicOffers);
  const turnstile = useTurnstile();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = () => {
    onClose();
  };

  const [prevVoucherCode, setPrevVoucherCode] = useState(voucherCode);
  if (prevVoucherCode !== voucherCode) {
    setPrevVoucherCode(voucherCode);
    setVoucherDraft(voucherCode);
    if (voucherCode.trim()) {
      setOffersOpen(true);
    }
  }

  const [prevSelectedPromotionId, setPrevSelectedPromotionId] = useState(selectedPromotionId);
  if (prevSelectedPromotionId !== selectedPromotionId) {
    setPrevSelectedPromotionId(selectedPromotionId);
    if (selectedPromotionId) {
      setOffersOpen(true);
    }
  }

  if (hasPublicOffers && !didAutoExpandOffers) {
    setDidAutoExpandOffers(true);
    setOffersOpen(true);
  }

  const prefillEmailKey = open ? customerAccountEmail.trim() : "";
  const [prevPrefillEmailKey, setPrevPrefillEmailKey] = useState(prefillEmailKey);
  if (prevPrefillEmailKey !== prefillEmailKey) {
    setPrevPrefillEmailKey(prefillEmailKey);
    if (prefillEmailKey && !form.customer_email.trim()) {
      setForm((current) => ({ ...current, customer_email: prefillEmailKey }));
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Session storage may be unavailable in restricted contexts.
    }
  }, [form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const shell = drawer?.closest(".storefront-shell");
    const inertSiblings: HTMLElement[] = [];

    if (shell && drawer) {
      for (const child of Array.from(shell.children)) {
        if (
          child instanceof HTMLElement &&
          !child.contains(drawer) &&
          !child.hasAttribute("inert")
        ) {
          child.setAttribute("inert", "");
          inertSiblings.push(child);
        }
      }
    }

    if (drawer) {
      (getFocusableElements(drawer)[0] ?? drawer).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !drawer) {
        return;
      }

      const elements = getFocusableElements(drawer);
      if (elements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || active === drawer || !drawer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const sibling of inertSiblings) {
        sibling.removeAttribute("inert");
      }
      const previousFocus = openerRef.current;
      openerRef.current = null;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer || drawer.contains(document.activeElement)) {
      return;
    }

    (getFocusableElements(drawer)[0] ?? drawer).focus();
  }, [cart, open, redirectingToPayment, stage]);

  useEffect(() => {
    if (open && stage === "checkout" && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open, stage]);

  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.product.price_cents * item.quantity,
    0
  );

  useEffect(() => {
    if (selectedPromotionId === null || !publicOffers) {
      return;
    }

    const selectedPromotion = publicOffers.promotions.find(
      (promotion) => promotion.id === selectedPromotionId
    );
    if (selectedPromotion && subtotalCents < selectedPromotion.minimum_subtotal_cents) {
      onPromotionChange(null);
    }
  }, [onPromotionChange, publicOffers, selectedPromotionId, subtotalCents]);

  const isDelivery = DELIVERY_CHECKOUT_ENABLED && form.fulfillment_method === "delivery";
  const addressReady = !isDelivery || isShippingAddressComplete(form.shipping_address);
  const canQuoteDelivery = isDelivery && addressReady;

  const canQuote = open && cart.length > 0;
  const quoteRequestKey = canQuote
    ? JSON.stringify({
        items: cart.map((item) => [item.product.id, item.quantity]),
        canQuoteDelivery,
        selectedPromotionId,
        voucherCode: voucherCode.trim(),
        shippingAddress: canQuoteDelivery ? form.shipping_address : null,
        shippingServiceCode: canQuoteDelivery ? form.shipping_service_code : null,
        quoteRetryNonce
      })
    : "inactive";
  const [prevQuoteRequestKey, setPrevQuoteRequestKey] = useState(quoteRequestKey);
  if (prevQuoteRequestKey !== quoteRequestKey) {
    setPrevQuoteRequestKey(quoteRequestKey);
    if (!canQuote) {
      setQuote(null);
      setQuoteFeedback(null);
      setIsQuoting(false);
    } else {
      setQuoteFeedback(null);
      setIsQuoting(true);
    }
  }

  useEffect(() => {
    if (!open || cart.length === 0) {
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(() => {
      void quoteCheckout({
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        fulfillment_method: canQuoteDelivery ? "delivery" : "pickup",
        promotion_id: selectedPromotionId ?? undefined,
        voucher_code: voucherCode.trim() || undefined,
        shipping_address: canQuoteDelivery ? form.shipping_address : undefined,
        shipping_service_code: canQuoteDelivery
          ? form.shipping_service_code || undefined
          : undefined
      })
        .then((nextQuote) => {
          if (cancelled) return;
          setQuote(nextQuote);
          if (canQuoteDelivery && nextQuote.shipping_options.length > 0) {
            const hasMatchingOption = nextQuote.shipping_options.some(
              (option) => option.code === form.shipping_service_code
            );
            if (!form.shipping_service_code || !hasMatchingOption) {
              setForm((current) => ({
                ...current,
                shipping_service_code: nextQuote.shipping_options[0].code
              }));
            }
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setQuote(null);
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
    canQuoteDelivery,
    cart,
    open,
    quoteRetryNonce,
    selectedPromotionId,
    voucherCode,
    form.shipping_address,
    form.shipping_service_code
  ]);

  if (!open) {
    return null;
  }

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const eligiblePromotions =
    publicOffers?.promotions.filter(
      (promotion) => subtotalCents >= promotion.minimum_subtotal_cents
    ) ?? [];
  const eligibleVouchers =
    publicOffers?.vouchers.filter((voucher) => subtotalCents >= voucher.minimum_subtotal_cents) ??
    [];

  const applyVoucherDraft = () => {
    onVoucherCodeChange(voucherDraft.trim());
  };

  const handleFulfillmentChange = (method: FulfillmentMethod) => {
    setForm((current) => ({
      ...current,
      fulfillment_method: method,
      shipping_service_code: method === "delivery" ? current.shipping_service_code : "",
      shipping_address:
        method === "delivery"
          ? {
              ...current.shipping_address,
              recipient_name: current.shipping_address.recipient_name.trim()
                ? current.shipping_address.recipient_name
                : current.customer_name,
              phone: current.shipping_address.phone.trim()
                ? current.shipping_address.phone
                : current.customer_phone
            }
          : current.shipping_address
    }));
  };

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
      const checkout = await onCheckout(
        {
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          fulfillment_method: DELIVERY_CHECKOUT_ENABLED ? form.fulfillment_method : "pickup",
          items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
          promotion_id: selectedPromotionId ?? undefined,
          voucher_code: voucherCode.trim() || undefined,
          shipping_address: isDelivery ? form.shipping_address : undefined,
          shipping_service_code: isDelivery ? form.shipping_service_code || undefined : undefined
        },
        turnstile.token
      );
      try {
        rememberPendingPayment(window.sessionStorage, {
          orderId: checkout.order.id,
          provider: checkout.provider
        });
      } catch {
        // The hosted checkout still works when session storage is unavailable.
      }
      setStage("cart");
      clearCheckoutDraft();
      setForm({
        ...EMPTY_CHECKOUT_FORM,
        customer_email: customerAccountEmail.trim()
      });
      setVoucherDraft("");
      setFeedback(null);
      onCompleted();
      setRedirectingToPayment(true);
      window.location.assign(checkout.payment_url);
    } catch (error) {
      turnstile.reset();
      setFeedback(normalizeError(error, { operation: "checkout", scope: "checkout" }).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  let title = t("shop.cartd.title");
  if (redirectingToPayment) {
    title = t("shop.cartd.securePayment");
  } else if (stage === "checkout") {
    title = t("shop.cartd.checkoutTitle");
  }

  const renderQuoteFeedback = () => {
    if (!quoteFeedback) {
      return null;
    }

    return (
      <div className="cart-feedback" role="alert">
        <span>{quoteFeedback}</span>
        <button
          className="text-link"
          onClick={() => setQuoteRetryNonce((count) => count + 1)}
          type="button"
        >
          {t("shop.cartd.retryQuote")}
        </button>
      </div>
    );
  };

  const renderTotals = () => {
    if (!quote) {
      return (
        <div className="cart-subtotal">
          <span>{t("shop.cartd.subtotal")}</span>
          <strong>{currencyFromCents(subtotalCents)}</strong>
        </div>
      );
    }

    return (
      <>
        <div className="cart-subtotal">
          <span>{t("shop.cartd.subtotal")}</span>
          <strong>{currencyFromCents(quote.subtotal_cents)}</strong>
        </div>
        {quote.discount_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>{t("shop.cartd.discount")}</span>
            <strong>-{currencyFromCents(quote.discount_cents)}</strong>
          </div>
        ) : null}
        {quote.applied_offers.length > 0 ? (
          <div className="cart-applied-offers">
            {quote.applied_offers.map((offer, index) => (
              <span key={`${offer.promotion_id ?? "p"}-${offer.voucher_id ?? "v"}-${index}`}>
                {offer.code ? `${offer.label} (${offer.code})` : offer.label}: -
                {currencyFromCents(offer.discount_cents)}
              </span>
            ))}
          </div>
        ) : null}
        {quote.tax_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>{t("shop.cartd.tax")}</span>
            <strong>{currencyFromCents(quote.tax_cents)}</strong>
          </div>
        ) : null}
        {quote.shipping_cents !== 0 ? (
          <div className="cart-subtotal">
            <span>{t("shop.cartd.shipping")}</span>
            <strong>{currencyFromCents(quote.shipping_cents)}</strong>
          </div>
        ) : null}
        <div className="cart-subtotal cart-subtotal--total">
          <span>{t("shop.cartd.total")}</span>
          <strong>{currencyFromCents(quote.total_cents)}</strong>
        </div>
      </>
    );
  };

  const cartProductIds = new Set(cart.map((item) => item.product.id));
  const emptyRecentProducts = recentlyViewed.slice(0, 6);
  const addonRecentProducts = recentlyViewed
    .filter((product) => !cartProductIds.has(product.id))
    .slice(0, 3);

  const renderRecentlyViewed = (items: Product[]) => {
    if (items.length === 0) return null;
    return (
      <section className="cart-recent" aria-label={t("shop.recent.title")}>
        <div className="cart-recent__head">
          <h3>{t("shop.recent.title")}</h3>
          {onClearRecentlyViewed ? (
            <button className="cart-recent__clear" onClick={onClearRecentlyViewed} type="button">
              {t("shop.recent.clear")}
            </button>
          ) : null}
        </div>
        <ul className="cart-recent__list">
          {items.map((product) => {
            const showThumb =
              !failedImageIds[product.id] && !isGenericPlaceholderImage(product.image_url);
            const canAdd = PURCHASE_ENABLED && product.stock_quantity > 0 && Boolean(onAddToCart);
            return (
              <li className="cart-recent__item" key={product.id}>
                {showThumb ? (
                  <img
                    alt={product.name}
                    className="cart-recent__thumb"
                    loading="lazy"
                    onError={() =>
                      setFailedImageIds((current) => ({ ...current, [product.id]: true }))
                    }
                    src={product.image_url}
                  />
                ) : (
                  <div
                    className="cart-recent__thumb cart-recent__thumb--missing"
                    aria-hidden="true"
                  >
                    <span className="cart-line-missing-mark" />
                  </div>
                )}
                <div className="cart-recent__info">
                  <button
                    className="cart-recent__name"
                    onClick={() => {
                      close();
                      onViewProduct?.(product.id);
                    }}
                    type="button"
                  >
                    {product.name}
                  </button>
                  <span className="cart-recent__price">
                    {currencyFromCents(product.price_cents)}
                  </span>
                </div>
                {canAdd ? (
                  <button
                    aria-label={`${t("shop.recent.add")}: ${product.name}`}
                    className="cart-recent__add"
                    onClick={() => onAddToCart?.(product)}
                    type="button"
                  >
                    + {t("shop.recent.add")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="cart-overlay">
      <div className="cart-scrim" aria-hidden="true" onClick={close} />
      <aside
        aria-label={t("shop.cartd.dialogLabel")}
        aria-modal="true"
        className="cart-drawer"
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="cart-drawer-head">
          <h2>{title}</h2>
          <button
            aria-label={t("shop.cartd.closeAria")}
            className="cart-close"
            onClick={close}
            type="button"
          >
            &times;
          </button>
        </header>

        <div className="cart-drawer-body" ref={bodyRef}>
          {redirectingToPayment ? (
            <div className="cart-confirmation" role="status">
              <p className="cart-confirm-badge">{t("shop.cartd.redirectingTitle")}</p>
              <p>{t("shop.cartd.redirectingBody")}</p>
            </div>
          ) : cart.length === 0 ? (
            <>
              <div className="cart-empty">
                <p>{t("shop.cartd.empty")}</p>
                <button className="outline-button" onClick={close} type="button">
                  {t("shop.cartd.browseProducts")}
                </button>
              </div>
              {renderRecentlyViewed(emptyRecentProducts)}
            </>
          ) : stage === "cart" ? (
            <>
              <ul className="cart-lines">
                {cart.map((item) => {
                  const showCartImage =
                    !failedImageIds[item.product.id] &&
                    !isGenericPlaceholderImage(item.product.image_url);
                  const atStockLimit = item.quantity >= item.product.stock_quantity;

                  return (
                    <li className="cart-line" key={item.product.id}>
                      {showCartImage ? (
                        <div className="cart-line-visual">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            loading="lazy"
                            onError={() =>
                              setFailedImageIds((current) => ({
                                ...current,
                                [item.product.id]: true
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div
                          className="cart-line-visual cart-line-visual--missing"
                          aria-hidden="true"
                        >
                          <span className="cart-line-missing-mark" />
                        </div>
                      )}
                      <div className="cart-line-body">
                        <div className="cart-line-info">
                          <strong>{item.product.name}</strong>
                          <span>
                            {t("shop.cartd.each", {
                              price: currencyFromCents(item.product.price_cents)
                            })}
                          </span>
                          {atStockLimit ? (
                            <span className="cart-stock-hint">
                              {t("shop.cartd.stockLimit", { n: item.product.stock_quantity })}
                            </span>
                          ) : null}
                        </div>
                        <div className="cart-line-controls">
                          <div className="qty-stepper">
                            <button
                              aria-label={`${t("shop.detail.decreaseQuantity")}: ${item.product.name}`}
                              disabled={item.quantity <= 1}
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              type="button"
                            >
                              &minus;
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={`${t("shop.detail.increaseQuantity")}: ${item.product.name}`}
                              disabled={atStockLimit}
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                          <strong>
                            {currencyFromCents(item.product.price_cents * item.quantity)}
                          </strong>
                          <button
                            className="cart-remove"
                            onClick={() => onRemoveFromCart(item.product.id)}
                            type="button"
                          >
                            {t("shop.cartd.remove")}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <details
                className="cart-offers-disclosure"
                onToggle={(event) => setOffersOpen(event.currentTarget.open)}
                open={offersOpen}
              >
                <summary>{t("shop.cartd.dealsVouchers")}</summary>
                <div className="cart-offers-disclosure__body">
                  <label>
                    <span>{t("shop.checkout.promotion")}</span>
                    <select
                      aria-label={t("shop.checkout.promotion")}
                      onChange={(event) =>
                        onPromotionChange(event.target.value ? Number(event.target.value) : null)
                      }
                      value={selectedPromotionId ?? ""}
                    >
                      <option value="">{t("shop.cartd.noPromotion")}</option>
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
                      {t("shop.cartd.removePromotion")}
                    </button>
                  ) : null}

                  <label>
                    <span>{t("shop.checkout.voucherCode")}</span>
                    <div className="cart-voucher-row">
                      <input
                        aria-label={t("shop.checkout.voucherCode")}
                        onChange={(event) => setVoucherDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            applyVoucherDraft();
                          }
                        }}
                        placeholder={t("shop.cartd.voucherPlaceholder")}
                        value={voucherDraft}
                      />
                      <button
                        className="outline-button"
                        disabled={isQuoting || (!voucherDraft.trim() && !voucherCode.trim())}
                        onClick={applyVoucherDraft}
                        type="button"
                      >
                        {t("shop.cartd.applyVoucher")}
                      </button>
                    </div>
                  </label>
                  {voucherCode.trim() ? (
                    <button
                      className="outline-button"
                      onClick={() => onVoucherCodeChange("")}
                      type="button"
                    >
                      {t("shop.cartd.removeVoucher")}
                    </button>
                  ) : null}

                  {eligibleVouchers.length > 0 ? (
                    <div>
                      <strong>{t("shop.cartd.publicVouchers")}</strong>
                      <div className="cart-offer-chips">
                        {eligibleVouchers.map((voucher) => {
                          const isApplied =
                            voucherCode.trim().toUpperCase() === voucher.code.toUpperCase();
                          return (
                            <button
                              aria-label={`${t("shop.cartd.applyVoucher")} ${voucher.code}`}
                              aria-pressed={isApplied}
                              className={`cart-offer-chip${isApplied ? " is-active" : ""}`}
                              disabled={isQuoting}
                              key={voucher.id}
                              onClick={() => onVoucherCodeChange(voucher.code)}
                              type="button"
                            >
                              {voucher.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {isQuoting ? (
                    <p className="cart-feedback cart-feedback--subtle" role="status">
                      {t("shop.cartd.updatingTotal")}
                    </p>
                  ) : null}
                  {renderQuoteFeedback()}
                </div>
              </details>
              {renderRecentlyViewed(addonRecentProducts)}
            </>
          ) : (
            <form className="cart-checkout-form" id={checkoutFormId} onSubmit={handleSubmit}>
              <details className="cart-checkout-summary">
                <summary>{t("shop.cartd.orderItems", { n: totalItemCount })}</summary>
                <ul>
                  {cart.map((item) => (
                    <li key={item.product.id}>
                      <span>
                        {item.quantity} &times; {item.product.name}
                      </span>
                      <strong>{currencyFromCents(item.product.price_cents * item.quantity)}</strong>
                    </li>
                  ))}
                </ul>
              </details>

              <label>
                <span>{t("shop.checkout.fullName")}</span>
                <input
                  autoComplete="name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customer_name: event.target.value }))
                  }
                  required
                  value={form.customer_name}
                />
              </label>
              <label>
                <span>{t("shop.checkout.email")}</span>
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customer_email: event.target.value }))
                  }
                  required
                  type="email"
                  value={form.customer_email}
                />
              </label>
              <label>
                <span>{t("shop.checkout.phone")}</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customer_phone: event.target.value }))
                  }
                  required
                  type="tel"
                  value={form.customer_phone}
                />
              </label>

              {DELIVERY_CHECKOUT_ENABLED ? (
                <div className="cart-fulfillment-group">
                  <span>{t("shop.checkout.fulfillment")}</span>
                  <div
                    aria-label={t("shop.checkout.fulfillment")}
                    className="cart-fulfillment-toggle"
                    role="group"
                  >
                    <button
                      aria-pressed={!isDelivery}
                      className={!isDelivery ? "is-active" : ""}
                      onClick={() => handleFulfillmentChange("pickup")}
                      type="button"
                    >
                      {t("shop.checkout.pickup")}
                    </button>
                    <button
                      aria-pressed={isDelivery}
                      className={isDelivery ? "is-active" : ""}
                      onClick={() => handleFulfillmentChange("delivery")}
                      type="button"
                    >
                      {t("shop.checkout.delivery")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cart-shipping-note" role="note">
                  <strong>{t("shop.checkout.pickup")}</strong>
                  <p>{t("shop.cartd.pickupStoreNote")}</p>
                </div>
              )}

              {isDelivery ? (
                <div className="cart-shipping-fields">
                  <p className="cart-shipping-note">{t("shop.checkout.deliveryNote")}</p>
                  {!addressReady ? (
                    <p className="cart-address-hint">{t("shop.cartd.addressHint")}</p>
                  ) : null}
                  <label>
                    <span>{t("shop.checkout.recipientName")}</span>
                    <input
                      autoComplete="shipping name"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            recipient_name: event.target.value
                          }
                        }))
                      }
                      required
                      value={form.shipping_address.recipient_name}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.phone")}</span>
                    <input
                      autoComplete="shipping tel"
                      inputMode="tel"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            phone: event.target.value
                          }
                        }))
                      }
                      required
                      type="tel"
                      value={form.shipping_address.phone}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.address1")}</span>
                    <input
                      autoComplete="shipping address-line1"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            address_line1: event.target.value
                          }
                        }))
                      }
                      required
                      value={form.shipping_address.address_line1}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.address2")}</span>
                    <input
                      autoComplete="shipping address-line2"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            address_line2: event.target.value
                          }
                        }))
                      }
                      value={form.shipping_address.address_line2}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.city")}</span>
                    <input
                      autoComplete="shipping address-level2"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            city: event.target.value
                          }
                        }))
                      }
                      required
                      value={form.shipping_address.city}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.state")}</span>
                    <input
                      autoComplete="shipping address-level1"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            state: event.target.value
                          }
                        }))
                      }
                      required
                      value={form.shipping_address.state}
                    />
                  </label>
                  <label>
                    <span>{t("shop.checkout.postalCode")}</span>
                    <input
                      autoComplete="shipping postal-code"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shipping_address: {
                            ...current.shipping_address,
                            postal_code: event.target.value
                          }
                        }))
                      }
                      required
                      value={form.shipping_address.postal_code}
                    />
                  </label>
                  {quote && quote.shipping_options.length > 0 ? (
                    <label>
                      <span>{t("shop.checkout.deliveryService")}</span>
                      <select
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            shipping_service_code: event.target.value
                          }))
                        }
                        value={form.shipping_service_code}
                      >
                        {quote.shipping_options.map((option: ShippingOption) => (
                          <option key={option.code} value={option.code}>
                            {option.name} &middot; {currencyFromCents(option.shipping_cents)}{" "}
                            &middot;{" "}
                            {t("shop.cartd.daysEstimate", {
                              min: option.min_delivery_days,
                              max: option.max_delivery_days
                            })}
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
              {isQuoting ? (
                <p className="cart-feedback cart-feedback--subtle" role="status">
                  {t("shop.cartd.updatingTotal")}
                </p>
              ) : null}
              {renderQuoteFeedback()}
              {!CARD_PAY_ENABLED ? (
                <p className="cart-feedback cart-feedback--subtle" role="status">
                  {t("shop.cartd.buyingPaused")}
                </p>
              ) : null}
              {CARD_PAY_ENABLED ? <TurnstileSlot turnstile={turnstile} /> : null}
            </form>
          )}
        </div>

        {cart.length > 0 && !redirectingToPayment ? (
          <footer className="cart-drawer-foot">
            {renderTotals()}
            {stage === "cart" ? (
              PURCHASE_ENABLED ? (
                <button
                  className="solid-button"
                  disabled={CARD_PAY_ENABLED && isQuoting}
                  onClick={() => setStage("checkout")}
                  type="button"
                >
                  {t("shop.cartd.proceedCheckout")}
                </button>
              ) : (
                <>
                  <p className="cart-feedback cart-feedback--subtle" role="status">
                    {t("shop.cartd.buyingPaused")}
                  </p>
                  <a className="solid-button" href={WA_COUNTER} rel="noopener" target="_blank">
                    {t("shop.cartd.sendWhatsapp")}
                  </a>
                </>
              )
            ) : (
              <div className="cart-checkout-actions">
                <button className="outline-button" onClick={() => setStage("cart")} type="button">
                  {t("shop.cartd.backToCart")}
                </button>
                <button
                  className="solid-button"
                  disabled={
                    isSubmitting ||
                    (CARD_PAY_ENABLED && isQuoting) ||
                    (CARD_PAY_ENABLED &&
                      isDelivery &&
                      (!addressReady || !form.shipping_service_code)) ||
                    (CARD_PAY_ENABLED && turnstile.isConfigured && !turnstile.token)
                  }
                  form={checkoutFormId}
                  type="submit"
                >
                  {CARD_PAY_ENABLED
                    ? isSubmitting
                      ? t("shop.cartd.placingOrder")
                      : t("shop.cartd.placeOrder")
                    : t("shop.cartd.sendWhatsapp")}
                </button>
              </div>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
