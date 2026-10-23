import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { SessionNotifier } from './session-notifier';

/**
 * SessionNotifyJob (module 11): every 30 seconds, queues the e-mails drivers asked for about
 * their sessions. The send job delivers them.
 */
@Injectable()
export class SessionNotifyJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly notifier: SessionNotifier,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let queued = 0;
    for (const tenantId of await this.tenants.ids()) {
      queued += await this.notifier.run(tenantId, now);
    }
    return queued;
  }

  protected intervalMs(): number {
    return this.config.sessionNotifyIntervalMs;
  }
}
