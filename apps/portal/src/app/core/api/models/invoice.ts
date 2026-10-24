/** issued: sent and unpaid; paid; void: cancelled. The company never sees Wattwisely's drafts. */
export type InvoiceStatus = 'issued' | 'paid' | 'void';

/** One line of an invoice; amounts in minor units of the invoice's currency. */
export interface InvoiceLine {
  id: string;
  position: number;
  kind: string;
  description: string;
  quantity: number;
  unit_price: number | null;
  amount: number;
  details: Record<string, unknown>;
}

/** One row of GET /v1/invoices: an invoice from Wattwisely to the company. */
export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  is_overdue: boolean;
  /** "2026-09" */
  month: string;
  /** "September 2026" */
  month_label: string;
  period_start: string;
  period_end: string;
  currency: string;
  subtotal: number;
  tax_rate_bps: number;
  tax_amount: number;
  total: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
}

/** GET /v1/invoices/{id}: the invoice with its lines. */
export interface Invoice extends InvoiceSummary {
  tenant_name: string;
  billing_name: string | null;
  billing_email: string | null;
  billing_reference: string | null;
  remarks: string[];
  payment_reference: string | null;
  void_reason: string | null;
  lines: InvoiceLine[];
}
