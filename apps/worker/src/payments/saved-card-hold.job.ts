import { Injectable } from '@nestjs/common';
import { PaymentStore } from '@wattwisely/payments';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';
import { CardHoldTaker } from './card-hold.taker';

/**
 * SavedCardHoldJob (module 19): a paid session started with an RFID card is running before
 * any money is held, because the charger does not wait. This job finds such sessions
 * without a hold and lets CardHoldTaker take one from the holder's saved card; the
 * settler then captures or releases it as for any other paid session.
 */
@Injectable()
export class SavedCardHoldJob extends IntervalJob {
  private readonly payments = new PaymentStore();

  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly batch: SessionBatch,
    private readonly taker: CardHoldTaker,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      const ids = await this.batch.ids(tenantId, (tx) =>
        this.payments.sessionIdsAwaitingHold(tx, now),
      );
      changed += await this.batch.each(tenantId, ids, (tx, session) =>
        this.taker.take(tx, session, now),
      );
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.savedCardHoldIntervalMs;
  }
}
