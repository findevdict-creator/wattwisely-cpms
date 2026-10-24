import { and, eq, inArray, isNull, lt, ne, notExists, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { invoices, tenants, tenantSubscriptions, Transaction } from '@wattwisely/db';
import { BillingPeriod } from '@wattwisely/billing';

/** A tenant whose subscription can change between active and past due. */
export interface SubscriptionToMark {
  tenantId: string;
  subscriptionId: string;
  slug: string;
}

/** What the billing jobs read across tenants and write per tenant, with platform access (worker only). */
@Injectable()
export class BillingRepository {
  /** Tenants with a plan to bill and no invoice yet for the month (a voided one does not count). */
  async tenantsWithoutInvoice(tx: Transaction, period: BillingPeriod): Promise<string[]> {
    const rows = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .innerJoin(tenantSubscriptions, eq(tenantSubscriptions.tenantId, tenants.id))
      .where(
        and(
          isNull(tenants.deletedAt),
          ne(tenants.status, 'cancelled'),
          ne(tenantSubscriptions.status, 'cancelled'),
          notExists(
            tx
              .select({ id: invoices.id })
              .from(invoices)
              .where(
                and(
                  eq(invoices.tenantId, tenants.id),
                  eq(invoices.periodStart, period.firstDay),
                  ne(invoices.status, 'void'),
                ),
              ),
          ),
        ),
      )
      .orderBy(tenants.createdAt);
    return rows.map((row) => row.id);
  }

  /** Active subscriptions with an issued invoice past its due date. */
  findToMarkPastDue(tx: Transaction, now: Date): Promise<SubscriptionToMark[]> {
    return this.subscriptions(tx).where(
      and(eq(tenantSubscriptions.status, 'active'), this.hasOverdue(tx, now)),
    );
  }

  /** Past due subscriptions whose overdue invoices were all paid or voided. */
  findToReinstate(tx: Transaction, now: Date): Promise<SubscriptionToMark[]> {
    return this.subscriptions(tx).where(
      and(eq(tenantSubscriptions.status, 'past_due'), sql`not ${this.hasOverdue(tx, now)}`),
    );
  }

  async setStatus(
    tx: Transaction,
    subscriptionId: string,
    status: 'active' | 'past_due',
    now: Date,
  ): Promise<void> {
    await tx
      .update(tenantSubscriptions)
      .set({ status, updatedAt: now, version: sql`${tenantSubscriptions.version} + 1` })
      .where(eq(tenantSubscriptions.id, subscriptionId));
  }

  private subscriptions(tx: Transaction) {
    return tx
      .select({
        tenantId: tenants.id,
        subscriptionId: tenantSubscriptions.id,
        slug: tenants.slug,
      })
      .from(tenantSubscriptions)
      .innerJoin(
        tenants,
        and(
          eq(tenants.id, tenantSubscriptions.tenantId),
          isNull(tenants.deletedAt),
          inArray(tenants.status, ['trial', 'active', 'suspended']),
        ),
      )
      .$dynamic();
  }

  private hasOverdue(tx: Transaction, now: Date) {
    return sql`exists ${tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantSubscriptions.tenantId),
          eq(invoices.status, 'issued'),
          lt(invoices.dueAt, now),
        ),
      )}`;
  }
}
