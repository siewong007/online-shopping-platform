import type { TranslationKey } from "../../i18n/translations";
import type { CartItem, Product } from "../../types";

export const CART_STORAGE_KEY = "depot-cart";
export const DELIVERY_CHECKOUT_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === "true";
export const PURCHASE_ENABLED = import.meta.env.VITE_ENABLE_PURCHASE !== "false";
export const CARD_PAY_ENABLED = import.meta.env.VITE_ENABLE_CARD_PAY === "true";
export const WA_COUNTER = "https://wa.me/60174056993";

export function askPriceHref(productName: string): string {
  return `${WA_COUNTER}?text=${encodeURIComponent(
    `Hi Ekoway, I want to confirm today's price and stock for ${productName}.`
  )}`;
}

export function pickupWhatsAppHref(cart: CartItem[], customerName: string, customerPhone: string, customerEmail: string): string {
  const lines = cart.map(
    (item) =>
      `- ${item.quantity} x ${item.product.name} (${formatWorklistPrice(item.product.price_cents)} each)`
  );
  const total = cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);
  const message = [
    "Hi Ekoway, pickup order (Salim):",
    ...lines,
    `Total ${formatWorklistPrice(total)}`,
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    customerEmail ? `Email: ${customerEmail}` : "",
    "I will collect at Lorong Salim 17."
  ]
    .filter(Boolean)
    .join("\n");
  return `${WA_COUNTER}?text=${encodeURIComponent(message)}`;
}

export function reconcileCartStock(cart: CartItem[], products: Product[]): CartItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  let changed = false;

  const nextCart = cart.flatMap((item) => {
    const currentProduct = productsById.get(item.product.id);
    if (!currentProduct) return [item];

    const stockLimit = Math.max(0, Math.floor(currentProduct.stock_quantity));
    if (stockLimit === 0) {
      changed = true;
      return [];
    }

    const nextQuantity = Math.min(item.quantity, stockLimit);
    const stockChanged =
      item.product.stock_quantity !== currentProduct.stock_quantity ||
      item.product.low_stock_threshold !== currentProduct.low_stock_threshold;

    if (!stockChanged && nextQuantity === item.quantity) return [item];

    changed = true;
    return [
      {
        ...item,
        product: {
          ...item.product,
          stock_quantity: currentProduct.stock_quantity,
          low_stock_threshold: currentProduct.low_stock_threshold
        },
        quantity: nextQuantity
      }
    ];
  });

  return changed ? nextCart : cart;
}

export function priceInputToCents(value: string): number | null {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export function formatWorklistPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(priceCents / 100)
    .replace(/\u00a0/g, " ");
}

export const seasonalTags = [
  "Hardware Supplies",
  "Fast Counter Service",
  "This Month's Picks",
  "Power Tools",
  "Nippon Paint",
  "Building Materials",
  "Bathroom Fittings",
  "Home Appliances"
];

export const quickServiceCalls: { key: TranslationKey; detail: TranslationKey }[] = [
  { key: "shop.svc.1.k", detail: "shop.svc.1.v" },
  { key: "shop.svc.2.k", detail: "shop.svc.2.v" },
  { key: "shop.svc.3.k", detail: "shop.svc.3.v" }
];
