import { Injectable } from '@nestjs/common';
import { auditLog, DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { BillingRepository, SubscriptionToMark } from './billing.repository';

/**
 * InvoiceOverdueJob (module 15): a tenant with an issued invoice past its due date has its
 * subscription marked past due, which the console and the tenant's Plan page show; once every
 * overdue invoice is paid or voided the subscription is active again. Nothing is switched
 * off: suspending a tenant that does not pay stays a decision for a person (module 9).
 */
@Injectable()
export class InvoiceOverdueJob extends IntervalJob {
  static readonly ACTOR_LABEL = 'Wattwisely (automatic)';

  constructor(
    private readonly config: WorkerConfig,
    private readonly runner: TransactionRunner,
    private readonly billing: BillingRepository,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    const { pastDue, reinstated } = await this.runner.run(
      DatabaseSession.forSystem(),
      async (tx) => ({
        pastDue: await this.billing.findToMarkPastDue(tx, now),
        reinstated: await this.billing.findToReinstate(tx, now),
      }),
    );
    for (const subscription of pastDue) {
      await this.mark(subscription, 'past_due', now);
    }
    for (const subscription of reinstated) {
      await this.mark(subscription, 'active', now);
    }
    return pastDue.length + reinstated.length;
  }

  private mark(subscription: SubscriptionToMark, status: 'active' | 'past_due', now: Date) {
    return this.runner.run(DatabaseSession.forSystemInTenant(subscription.tenantId), async (tx) => {
      await this.billing.setStatus(tx, subscription.subscriptionId, status, now);
      await this.audit(tx, subscription, status, now);
      this.logger.log(`Subscription of tenant ${subscription.slug} is now ${status}`);
    });
  }

  private async audit(
    tx: Transaction,
    subscription: SubscriptionToMark,
    status: 'active' | 'past_due',
    now: Date,
  ): Promise<void> {
    const isPastDue = status === 'past_due';
    await tx.insert(auditLog).values({
      id: UuidV7.create(),
      tenantId: subscription.tenantId,
      actorType: 'system',
      actorId: null,
      actorLabel: InvoiceOverdueJob.ACTOR_LABEL,
      action: isPastDue ? 'subscription.past_due' : 'subscription.reinstated',
      targetType: 'subscription',
      targetId: subscription.subscriptionId,
      targetLabel: subscription.slug,
      before: { status: isPastDue ? 'active' : 'past_due' },
      after: {
        status,
        reason: isPastDue ? 'An invoice is past its due date' : 'No invoice is overdue any more',
        at: now.toISOString(),
      },
    });
  }

  protected intervalMs(): number {
    return this.config.invoiceIntervalMs;
  }
}
