import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { plans, tenantSubscriptions, Transaction, UuidV7 } from '@wattwisely/db';
import { PlanRecord } from '../plans/plan-record';

/** One tenant_subscriptions row with its plan. */
export interface SubscriptionRecord {
  subscription: typeof tenantSubscriptions.$inferSelect;
  plan: PlanRecord;
}

/** The columns staff set when they put a tenant on a plan. */
export type SubscriptionChanges = Partial<
  Pick<
    typeof tenantSubscriptions.$inferInsert,
    | 'planId'
    | 'status'
    | 'trialEndsAt'
    | 'billingEmail'
    | 'billingName'
    | 'billingReference'
    | 'notes'
    | 'updatedBy'
  >
>;

/** Reads and writes each tenant's plan. A tenant sees its own row; platform access sees all. */
@Injectable()
export class SubscriptionsRepository {
  async findByTenant(tx: Transaction, tenantId: string): Promise<SubscriptionRecord | null> {
    const rows = await tx
      .select({ subscription: tenantSubscriptions, plan: plans })
      .from(tenantSubscriptions)
      .innerJoin(plans, eq(plans.id, tenantSubscriptions.planId))
      .where(eq(tenantSubscriptions.tenantId, tenantId));
    return rows[0] ?? null;
  }

  /** Creates the tenant's row; `planId` is required for that. */
  async insert(
    tx: Transaction,
    tenantId: string,
    changes: SubscriptionChanges & { planId: string },
  ): Promise<void> {
    await tx.insert(tenantSubscriptions).values({ id: UuidV7.create(), tenantId, ...changes });
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: SubscriptionChanges,
  ): Promise<boolean> {
    const rows = await tx
      .update(tenantSubscriptions)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(tenantSubscriptions.id, id), eq(tenantSubscriptions.version, version)))
      .returning({ id: tenantSubscriptions.id });
    return rows.length === 1;
  }
}
