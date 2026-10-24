/** draft: being prepared; issued: sent and unpaid; paid; void: cancelled. */
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

/** What the list can be narrowed to; "overdue" is an issued invoice past its due date. */
export type InvoiceListStatus = InvoiceStatus | 'overdue';

/** One line of an invoice; amounts in minor units of the invoice's currency. */
export interface InvoiceLine {
  id: string;
  position: number;
  kind:
    | 'platform_fee'
    | 'ac_connector_fee'
    | 'dc_connector_fee'
    | 'addon'
    | 'managed_service'
    | 'revenue_share'
    | 'adjustment';
  description: string;
  quantity: number;
  unit_price: number | null;
  amount: number;
  details: Record<string, unknown>;
}

/** One row of GET /v1/admin/invoices. */
export interface InvoiceSummary {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
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
  created_at: string;
  version: number;
}

/** GET /v1/admin/invoices/{id}: the invoice with its lines and remarks. */
export interface Invoice extends InvoiceSummary {
  billing_name: string | null;
  billing_email: string | null;
  billing_reference: string | null;
  remarks: string[];
  payment_reference: string | null;
  void_reason: string | null;
  lines: InvoiceLine[];
}

export interface InvoicePage {
  items: InvoiceSummary[];
  next_cursor: string | null;
}

/** Body of POST /v1/admin/invoices/{id}/lines: a credit (negative) or a one-off charge. */
export interface AdjustmentRequest {
  description: string;
  amount: number;
}

/** Body of POST /v1/admin/invoices/{id}/pay. */
export interface PayInvoiceRequest {
  paid_at?: string;
  payment_reference?: string;
}

/** Answer of POST /v1/admin/invoices/{id}/issue. */
export interface IssueInvoiceResult {
  invoice: Invoice;
  is_email_sent: boolean;
}
