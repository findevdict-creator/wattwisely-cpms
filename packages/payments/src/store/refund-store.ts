import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { refunds, Transaction } from '@wattwisely/db';
import { NewRefund, RefundRow } from './payment-rows';

/** Reads and writes refunds. RLS limits every query to the current tenant. */
export class RefundStore {
  async insert(tx: Transaction, row: NewRefund): Promise<RefundRow> {
    const rows = await tx.insert(refunds).values(row).returning();
    return rows[0];
  }

  async findById(tx: Transaction, id: string): Promise<RefundRow | null> {
    const rows = await tx.select().from(refunds).where(eq(refunds.id, id));
    return rows[0] ?? null;
  }

  async findForUpdate(tx: Transaction, id: string): Promise<RefundRow | null> {
    const rows = await tx.select().from(refunds).where(eq(refunds.id, id)).for('update');
    return rows[0] ?? null;
  }

  async findByProviderRefundId(tx: Transaction, providerRefundId: string) {
    const rows = await tx
      .select()
      .from(refunds)
      .where(eq(refunds.providerRefundId, providerRefundId));
    return rows[0] ?? null;
  }

  /** A payment's refunds, oldest first. */
  async listForPayment(tx: Transaction, paymentId: string): Promise<RefundRow[]> {
    return tx
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, paymentId))
      .orderBy(asc(refunds.createdAt));
  }

  /** What is already spoken for: refunds that went through or may still go through. */
  async reservedAmount(tx: Transaction, paymentId: string): Promise<number> {
    const rows = await tx
      .select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` })
      .from(refunds)
      .where(
        and(
          eq(refunds.paymentId, paymentId),
          inArray(refunds.status, ['awaiting_approval', 'pending', 'succeeded']),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  async update(tx: Transaction, id: string, changes: Partial<NewRefund>): Promise<void> {
    await tx
      .update(refunds)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(refunds.id, id));
  }
}
