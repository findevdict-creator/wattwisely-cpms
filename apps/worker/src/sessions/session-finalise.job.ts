import { Injectable } from '@nestjs/common';
import { FinalisePolicy, SessionFinaliser } from '@wattwisely/session-engine';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';

/**
 * SessionFinaliseJob (Sessions and Pricing design): prices each stopped session once
 * the car has left, or four hours after the stop, and completes it. Pricing a session
 * twice does nothing, so a run that overlaps another worker is harmless.
 */
@Injectable()
export class SessionFinaliseJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly batch: SessionBatch,
    private readonly finaliser: SessionFinaliser,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      changed += await this.batch.inStates(tenantId, ['stopping'], async (tx, session) => {
        if (!FinalisePolicy.isDue(session, now)) {
          return false;
        }
        return (await this.finaliser.finalise(tx, session, now)) !== null;
      });
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.finaliseIntervalMs;
  }
}
