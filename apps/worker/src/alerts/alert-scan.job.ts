import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { AlertTracker } from './alert-tracker';

/**
 * AlertScanJob (module 11): every 30 seconds, looks at every tenant's chargers and opens,
 * updates and closes their alerts. Returns how many alerts opened or closed.
 */
@Injectable()
export class AlertScanJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly tracker: AlertTracker,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      const result = await this.tracker.scan(tenantId, now);
      changed += result.opened + result.closed;
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.alertScanIntervalMs;
  }
}
