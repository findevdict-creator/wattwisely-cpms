import { and, asc, eq, ne } from 'drizzle-orm';
import { invoiceLines, invoices, Transaction, UuidV7 } from '@wattwisely/db';
import { InvoiceDraft, InvoiceLineDraft } from '../invoice/invoice-draft';
import { InvoiceInput } from '../invoice/invoice-input';
import { InvoiceTotalAmounts, InvoiceTotals } from '../invoice/invoice-totals';
import { BillingPeriod } from '../period/billing-period';

/** Whose invoice for which month, and who drafted it (null for the worker). */
export interface DraftTarget {
  tenantId: string;
  period: BillingPeriod;
  createdBy: string | null;
}

/** The invoice row's fields the writer needs to replace lines and keep the totals right. */
export interface InvoiceToTotal {
  id: string;
  tenantId: string;
  taxRateBps: number;
}

/**
 * Writes drafts (module 15): a new invoice with its lines, the fee lines of a draft replaced
 * after a regeneration (staff adjustments stay), and the totals added up again after a line
 * came or went. Platform access inside the tenant.
 */
export class InvoiceDraftWriter {
  static async insert(
    tx: Transaction,
    target: DraftTarget,
    input: InvoiceInput,
    draft: InvoiceDraft,
  ): Promise<string> {
    const id = UuidV7.create();
    const taxRateBps = input.subscription.taxRateBps;
    const totals = InvoiceTotals.of(draft.lines, taxRateBps);
    await tx.insert(invoices).values({
      id,
      tenantId: target.tenantId,
      periodStart: target.period.firstDay,
      periodEnd: target.period.lastDay,
      currency: draft.currency,
      taxRateBps,
      ...totals,
      billingName: input.subscription.billingName,
      billingEmail: input.subscription.billingEmail,
      billingReference: input.subscription.billingReference,
      remarks: draft.remarks.join('\n'),
      createdBy: target.createdBy,
    });
    await InvoiceDraftWriter.insertLines(tx, { id, tenantId: target.tenantId }, draft.lines, 1);
    return id;
  }

  /** New fee lines in place of the old ones; adjustments move to the end. */
  static async replaceFeeLines(
    tx: Transaction,
    invoice: InvoiceToTotal,
    draft: InvoiceDraft,
  ): Promise<InvoiceTotalAmounts> {
    const adjustments = await tx
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, invoice.id), eq(invoiceLines.kind, 'adjustment')))
      .orderBy(asc(invoiceLines.position));
    await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));
    const kept: InvoiceLineDraft[] = adjustments.map((line) => ({
      kind: 'adjustment',
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
      details: line.details,
    }));
    await InvoiceDraftWriter.insertLines(tx, invoice, [...draft.lines, ...kept], 1);
    await tx
      .update(invoices)
      .set({ remarks: draft.remarks.join('\n'), currency: draft.currency })
      .where(eq(invoices.id, invoice.id));
    return InvoiceDraftWriter.recalculate(tx, invoice);
  }

  /** The totals from the lines as they are now, written to the invoice. */
  static async recalculate(
    tx: Transaction,
    invoice: Pick<InvoiceToTotal, 'id' | 'taxRateBps'>,
  ): Promise<InvoiceTotalAmounts> {
    const lines = await tx
      .select({ amount: invoiceLines.amount })
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoice.id));
    const totals = InvoiceTotals.of(lines, invoice.taxRateBps);
    await tx
      .update(invoices)
      .set({ ...totals, updatedAt: new Date() })
      .where(eq(invoices.id, invoice.id));
    return totals;
  }

  /** The position after the last line, for a new adjustment. */
  static async nextPosition(tx: Transaction, invoiceId: string): Promise<number> {
    const rows = await tx
      .select({ position: invoiceLines.position })
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, invoiceId), ne(invoiceLines.position, 0)))
      .orderBy(asc(invoiceLines.position));
    return (rows[rows.length - 1]?.position ?? 0) + 1;
  }

  private static async insertLines(
    tx: Transaction,
    invoice: { id: string; tenantId: string },
    lines: InvoiceLineDraft[],
    firstPosition: number,
  ): Promise<void> {
    if (lines.length === 0) {
      return;
    }
    await tx.insert(invoiceLines).values(
      lines.map((line, index) => ({
        id: UuidV7.create(),
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        position: firstPosition + index,
        kind: line.kind,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        details: line.details,
      })),
    );
  }
}
