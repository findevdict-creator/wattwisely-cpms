import { Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { plans, tenantSubscriptions, Transaction } from '@wattwisely/db';
import { PlanRecord } from './plan-record';

/** Reads and writes the plan catalogue. Every request may read it; only platform access may write. */
@Injectable()
export class PlansRepository {
  async findAll(tx: Transaction, isActiveOnly: boolean): Promise<PlanRecord[]> {
    return tx
      .select()
      .from(plans)
      .where(isActiveOnly ? eq(plans.isActive, true) : undefined)
      .orderBy(asc(plans.sortOrder), asc(plans.name));
  }

  async findById(tx: Transaction, id: string): Promise<PlanRecord | null> {
    const rows = await tx.select().from(plans).where(eq(plans.id, id));
    return rows[0] ?? null;
  }

  async findByCode(tx: Transaction, code: string): Promise<PlanRecord | null> {
    const rows = await tx.select().from(plans).where(eq(plans.code, code));
    return rows[0] ?? null;
  }

  /** How many tenants are on each plan (platform access sees every subscription). */
  async countTenants(tx: Transaction): Promise<Map<string, number>> {
    const rows = await tx
      .select({ planId: tenantSubscriptions.planId, count: count() })
      .from(tenantSubscriptions)
      .groupBy(tenantSubscriptions.planId);
    return new Map(rows.map((row) => [row.planId, row.count]));
  }

  async insert(tx: Transaction, row: typeof plans.$inferInsert): Promise<void> {
    await tx.insert(plans).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof plans.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(plans)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(plans.id, id), eq(plans.version, version)))
      .returning({ id: plans.id });
    return rows.length === 1;
  }
}
