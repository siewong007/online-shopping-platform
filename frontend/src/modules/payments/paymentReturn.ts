export type PaymentReturnResult = {
  isPaymentReturn: boolean;
  search: string;
};

export type PendingPaymentReference = {
  orderId: number;
  provider: string;
};

const PENDING_PAYMENT_KEY = "ekoway_pending_payment";

type PaymentStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

/** Keeps only a non-sensitive order reference across the hosted-checkout redirect. */
export function rememberPendingPayment(
  storage: PaymentStorage,
  reference: PendingPaymentReference
): void {
  if (!Number.isInteger(reference.orderId) || reference.orderId <= 0) return;
  storage.setItem(
    PENDING_PAYMENT_KEY,
    JSON.stringify({ orderId: reference.orderId, provider: reference.provider.trim().toLowerCase() })
  );
}

/** Reads and clears the reference once. It never interprets a browser return as payment proof. */
export function takePendingPayment(storage: PaymentStorage): PendingPaymentReference | null {
  const raw = storage.getItem(PENDING_PAYMENT_KEY);
  storage.removeItem(PENDING_PAYMENT_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PendingPaymentReference>;
    if (!Number.isInteger(value.orderId) || Number(value.orderId) <= 0) return null;
    if (typeof value.provider !== "string" || !value.provider.trim()) return null;
    return { orderId: Number(value.orderId), provider: value.provider.trim().toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Recognises the current HitPay return marker while retaining the legacy hosted-gateway marker.
 * This function only cleans the URL; it never calls a payment API or changes order state.
 */
export function consumePaymentReturn(search: string): PaymentReturnResult {
  const params = new URLSearchParams(search);
  const isHitPayReturn = params.get("payment_return") === "hitpay";
  const isLegacyReturn = params.get("payment") === "return";

  if (!isHitPayReturn && !isLegacyReturn) {
    return { isPaymentReturn: false, search: params.toString() };
  }

  if (isHitPayReturn) {
    params.delete("payment_return");
  }
  if (isLegacyReturn) {
    params.delete("payment");
  }

  return { isPaymentReturn: true, search: params.toString() };
}
