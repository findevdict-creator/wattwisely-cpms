import { invoiceLines, invoices } from '@wattwisely/db';

/** One invoices row. */
export type InvoiceRow = typeof invoices.$inferSelect;

/** One invoice_lines row. */
export type InvoiceLineRow = typeof invoiceLines.$inferSelect;

/** An invoice with whose it is. */
export interface InvoiceRecord {
  invoice: InvoiceRow;
  tenant: { slug: string; name: string };
}

/** An invoice with its lines, for the invoice page. */
export interface InvoiceWithLines extends InvoiceRecord {
  lines: InvoiceLineRow[];
}

/** What an invoice's status allows. */
export class InvoiceStatuses {
  /** Issued, and the due date has passed. */
  static isOverdue(invoice: Pick<InvoiceRow, 'status' | 'dueAt'>, now = new Date()): boolean {
    return invoice.status === 'issued' && invoice.dueAt !== null && invoice.dueAt < now;
  }

  static canBeVoided(status: InvoiceRow['status']): boolean {
    return status === 'draft' || status === 'issued';
  }
}
