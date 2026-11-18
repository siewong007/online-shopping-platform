import { postJson, turnstileHeaders } from "../../../shared/api/http";
import type {
  CheckoutQuote,
  CheckoutQuoteInput,
  CreateOrderInput,
  Order,
  PaymentCheckout
} from "../types";

export function checkout(input: CreateOrderInput, turnstileToken?: string | null): Promise<Order> {
  return postJson<CreateOrderInput, Order>(
    "/api/checkout",
    input,
    "customer",
    turnstileHeaders(turnstileToken)
  );
}

export function startPaymentCheckout(
  input: CreateOrderInput,
  turnstileToken?: string | null
): Promise<PaymentCheckout> {
  return postJson<CreateOrderInput, PaymentCheckout>(
    "/api/checkout/payment",
    input,
    "customer",
    turnstileHeaders(turnstileToken)
  );
}

export function quoteCheckout(input: CheckoutQuoteInput): Promise<CheckoutQuote> {
  return postJson<CheckoutQuoteInput, CheckoutQuote>("/api/checkout/quote", input, "customer");
}
