import { Injectable } from '@nestjs/common';
import { SessionFinaliser, SessionStates } from '@wattwisely/session-engine';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';

/**
 * StaleSessionSweepJob (Sessions and Pricing design): every ten minutes, closes as
 * failed (reason stale) any session that has had no news for 24 hours from a charger
 * that has not been seen for 24 hours either. A long session on a charger that is still
 * talking is left alone; it is flagged for review when it is priced instead.
 */
@Injectable()
export class StaleSessionSweepJob extends IntervalJob {
  static readonly SILENT_MS = 24 * 60 * 60 * 1000;
  static readonly STATES = [...SessionStates.ACTIVE, 'stopping' as const];

  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly batch: SessionBatch,
    private readonly finaliser: SessionFinaliser,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    const since = new Date(now.getTime() - StaleSessionSweepJob.SILENT_MS);
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      const ids = await this.batch.ids(tenantId, (tx, sessions) =>
        sessions.silentSince(tx, StaleSessionSweepJob.STATES, since),
      );
      changed += await this.batch.each(tenantId, ids, async (tx, session) => {
        return (await this.finaliser.fail(tx, session, 'stale', now)) !== null;
      });
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.staleSweepIntervalMs;
  }
}
