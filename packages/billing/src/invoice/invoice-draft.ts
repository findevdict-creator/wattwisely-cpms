/** What an invoice line charges for; the same words as the database enum. */
export type InvoiceLineKind =
  | 'platform_fee'
  | 'ac_connector_fee'
  | 'dc_connector_fee'
  | 'addon'
  | 'managed_service'
  | 'revenue_share'
  | 'adjustment';

/** One line of an invoice before it is stored. */
export interface InvoiceLineDraft {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  /** Per unit and month, before proration; null for a share or an adjustment. */
  unitPrice: number | null;
  amount: number;
  /** How the amount came about, for the line's small print and for audits. */
  details: Record<string, unknown>;
}

/** The calculator's answer: the fee lines and what it had to leave out. */
export interface InvoiceDraft {
  currency: string;
  lines: InvoiceLineDraft[];
  remarks: string[];
}
