export type PaymentStatus = "Pending" | "Captured" | "Refunded" | "Failed" | "Void";

export type Payment = {
  id: number;
  order_id: number;
  order_customer_name: string;
  order_customer_email: string;
  order_subtotal_cents: number;
  idempotency_key: string;
  amount_cents: number;
  method: string;
  status: PaymentStatus;
  reference: string;
  notes: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePaymentInput = {
  order_id: number;
  idempotency_key: string;
  amount_cents: number;
  method: string;
  status: PaymentStatus;
  reference: string;
  notes: string;
};

export type UpdatePaymentInput = Omit<CreatePaymentInput, "order_id" | "idempotency_key">;
