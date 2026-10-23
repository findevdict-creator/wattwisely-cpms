import { Injectable } from '@nestjs/common';
import { StartWatchdog } from '@wattwisely/payments';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';

/**
 * SessionStartTimeoutJob (Stripe Payments design, "When it goes wrong"): looks at every
 * paid session still waiting to start and gives up on the ones that never will: no card
 * within 15 minutes, a charger that rejected the start, or no StartTransaction 90 seconds
 * after the hold. The settler then releases the hold.
 */
@Injectable()
export class SessionStartTimeoutJob extends IntervalJob {
  private readonly watchdog = new StartWatchdog();

  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly batch: SessionBatch,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      changed += await this.batch.inStates(
        tenantId,
        ['authorising', 'starting'],
        async (tx, session) => (await this.watchdog.check(tx, session, now)) !== null,
      );
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.startTimeoutIntervalMs;
  }
}
