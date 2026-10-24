import { Injectable } from '@nestjs/common';
import { AddonNames, BillingPeriod, InvoiceDrafter } from '@wattwisely/billing';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { BillingRepository } from './billing.repository';

/**
 * InvoiceDraftJob (module 15): once the month is over, drafts last month's invoice for every
 * tenant with a plan that has none yet. Staff check and issue the drafts in the admin console.
 * A tenant whose month comes to nothing (a trial, a cancelled plan, a Flex plan with no
 * sessions) gets no draft; a voided invoice makes the job draft the month again.
 */
@Injectable()
export class InvoiceDraftJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly runner: TransactionRunner,
    private readonly billing: BillingRepository,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    const period = BillingPeriod.before(now);
    const tenantIds = await this.runner.run(DatabaseSession.forSystem(), (tx) =>
      this.billing.tenantsWithoutInvoice(tx, period),
    );
    let drafted = 0;
    for (const tenantId of tenantIds) {
      if (await this.draft(tenantId, period)) {
        drafted += 1;
      }
    }
    return drafted;
  }

  /** True when the tenant got a draft for the month. */
  draft(tenantId: string, period: BillingPeriod): Promise<boolean> {
    return this.runner.run(DatabaseSession.forSystemInTenant(tenantId), async (tx) => {
      const prepared = await InvoiceDrafter.prepare(tx, tenantId, period, AddonNames.of);
      if (!prepared || !InvoiceDrafter.hasCharges(prepared)) {
        return false;
      }
      const id = await InvoiceDrafter.create(tx, { tenantId, period, createdBy: null }, prepared);
      this.logger.log(`Invoice ${id} drafted for tenant ${tenantId}, ${period.key}`);
      return true;
    });
  }

  protected intervalMs(): number {
    return this.config.invoiceIntervalMs;
  }
}
