import { asc, eq } from 'drizzle-orm';
import { chargingSessions, sessionLineItems, Transaction } from '@wattwisely/db';
import { ReceiptLine } from '../../tariffs/dto/receipt-line.dto';

/** What the driver's page shows once the session has its final price, and why it failed if it did. */
export interface ChargeOutcome {
  pricedAt: Date | null;
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  failureReason: string | null;
  /** Empty until the session is priced. */
  lines: ReceiptLine[];
}

/** Reads a session's final price, its receipt lines and its failure reason for the driver's page. */
export class ChargeReceiptLookup {
  static readonly EMPTY: ChargeOutcome = {
    pricedAt: null,
    netAmount: null,
    taxAmount: null,
    grossAmount: null,
    failureReason: null,
    lines: [],
  };

  async of(tx: Transaction, sessionId: string): Promise<ChargeOutcome> {
    const rows = await tx
      .select({
        pricedAt: chargingSessions.pricedAt,
        netAmount: chargingSessions.netAmount,
        taxAmount: chargingSessions.taxAmount,
        grossAmount: chargingSessions.grossAmount,
        failureReason: chargingSessions.failureReason,
      })
      .from(chargingSessions)
      .where(eq(chargingSessions.id, sessionId));
    const totals = rows[0];
    if (!totals) {
      return ChargeReceiptLookup.EMPTY;
    }
    return { ...totals, lines: totals.pricedAt ? await this.lines(tx, sessionId) : [] };
  }

  private async lines(tx: Transaction, sessionId: string): Promise<ReceiptLine[]> {
    const rows = await tx
      .select()
      .from(sessionLineItems)
      .where(eq(sessionLineItems.sessionId, sessionId))
      .orderBy(asc(sessionLineItems.position));
    return rows.map((row) => ({ ...row, from: row.fromAt, to: row.toAt }));
  }
}
