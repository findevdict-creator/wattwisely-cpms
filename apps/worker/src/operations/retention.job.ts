import { Injectable } from '@nestjs/common';
import { DatabaseSession } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { RetentionRules } from './retention-rules';
import { RetentionSweeper } from './retention.sweeper';

/**
 * RetentionJob (module 12): every hour, deletes what has been kept long enough (the OCPP
 * message log, old e-mails, bell lines, drivers' addresses, old exports and webhook
 * events), inside each tenant and then the global tables. Returns how many rows went.
 */
@Injectable()
export class RetentionJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly sweeper: RetentionSweeper,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let deleted = 0;
    const rules = RetentionRules.perTenant(this.config.retention);
    for (const tenantId of await this.tenants.ids()) {
      for (const rule of rules) {
        deleted += await this.sweeper.sweep(DatabaseSession.forTenant(tenantId), rule, now);
      }
    }
    for (const rule of RetentionRules.global(this.config.retention)) {
      deleted += await this.sweeper.sweep(DatabaseSession.anonymous(), rule, now);
    }
    return deleted;
  }

  protected intervalMs(): number {
    return this.config.retentionIntervalMs;
  }
}
