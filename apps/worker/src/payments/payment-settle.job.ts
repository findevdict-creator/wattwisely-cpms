import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  PaymentSettler,
  PaymentStore,
} from '@wattwisely/payments';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';

/**
 * PaymentSettleJob (Stripe Payments design, "Capture"): once a paid session has ended and
 * been closed, captures its final price from the card hold, or releases the hold when
 * there is nothing to pay. A capture the provider could not do is tried again with
 * growing gaps for up to 72 hours, then left as capture_failed for staff.
 */
@Injectable()
export class PaymentSettleJob extends IntervalJob {
  private readonly payments = new PaymentStore();
  private readonly settler: PaymentSettler;

  constructor(
    private readonly config: WorkerConfig,
    private readonly runner: TransactionRunner,
    private readonly tenants: TenantIterator,
    @Inject(PAYMENT_GATEWAY) gateway: PaymentGateway,
  ) {
    super();
    this.settler = new PaymentSettler(gateway);
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      const session = DatabaseSession.forTenant(tenantId);
      const ids = await this.runner.run(session, (tx) => this.payments.idsToSettle(tx, now));
      for (const id of ids) {
        changed += (await this.settle(session, id, now)) ? 1 : 0;
      }
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.paymentSettleIntervalMs;
  }

  private async settle(session: DatabaseSession, id: string, now: Date): Promise<boolean> {
    try {
      return await this.runner.run(session, async (tx) => {
        const payment = await this.payments.findForUpdate(tx, id);
        return payment ? this.settler.settle(tx, payment, now) : false;
      });
    } catch (error) {
      this.logger.error(`Payment ${id}: ${(error as Error).message}`);
      return false;
    }
  }
}
