export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue" | "void";

export type InvoiceLineItem = {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type InvoicePayment = {
  id: number;
  amount_cents: number;
  method: string;
  paid_at: string;
  note: string;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  order_id: number;
  status: InvoiceStatus;
  billing_name: string;
  billing_email: string;
  billing_address: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  issued_at: string;
  due_at: string;
  voided_at: string | null;
  line_items: InvoiceLineItem[];
  payments: InvoicePayment[];
};

export type CreateInvoiceFromOrderInput = {
  discount_cents?: number;
};

export type UpdateInvoiceBillingInput = {
  billing_address: string;
};

export type RecordInvoicePaymentInput = {
  amount_cents: number;
  method: string;
  note: string;
};
