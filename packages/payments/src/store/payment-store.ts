import { and, asc, desc, eq, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { chargingSessions, payments, Transaction } from '@wattwisely/db';
import { NewPayment, PaymentRow, PaymentStatuses } from './payment-rows';

/** Reads and writes payments. RLS limits every query to the current tenant. */
export class PaymentStore {
  static readonly BATCH = 100;

  async insert(tx: Transaction, row: NewPayment): Promise<PaymentRow> {
    const rows = await tx.insert(payments).values(row).returning();
    return rows[0];
  }

  async findById(tx: Transaction, id: string): Promise<PaymentRow | null> {
    const rows = await tx.select().from(payments).where(eq(payments.id, id));
    return rows[0] ?? null;
  }

  /** Locks the row for the rest of the transaction, so the API and the worker never settle one payment twice. */
  async findForUpdate(tx: Transaction, id: string): Promise<PaymentRow | null> {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .for('update', { skipLocked: true });
    return rows[0] ?? null;
  }

  /** The pre-authorisation of a session, when it is a paid one. */
  async findBySession(tx: Transaction, sessionId: string): Promise<PaymentRow | null> {
    const rows = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.sessionId, sessionId), eq(payments.type, 'preauth')))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByProviderPaymentId(tx: Transaction, providerPaymentId: string) {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, providerPaymentId));
    return rows[0] ?? null;
  }

  async update(tx: Transaction, id: string, changes: Partial<NewPayment>): Promise<void> {
    await tx
      .update(payments)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(payments.id, id));
  }

  /**
   * Open payments whose session has ended and whose next try is due: the worker captures
   * or releases them. Oldest first, so a provider outage is worked off in order.
   */
  async idsToSettle(tx: Transaction, now: Date, limit = PaymentStore.BATCH): Promise<string[]> {
    const rows = await tx
      .select({ id: payments.id })
      .from(payments)
      .innerJoin(chargingSessions, eq(chargingSessions.id, payments.sessionId))
      .where(
        and(
          inArray(payments.status, PaymentStatuses.OPEN),
          isNotNull(chargingSessions.closedAt),
          or(sql`${payments.nextAttemptAt} is null`, lte(payments.nextAttemptAt, now)),
        ),
      )
      .orderBy(asc(chargingSessions.closedAt))
      .limit(limit);
    return rows.map((row) => row.id);
  }
}
