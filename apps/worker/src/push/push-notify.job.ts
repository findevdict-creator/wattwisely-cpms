import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { PushNotifier } from './push-notifier';

/**
 * PushNotifyJob (module 34): every 15 seconds, sends the pushes drivers with the app are due
 * about their charges.
 */
@Injectable()
export class PushNotifyJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly notifier: PushNotifier,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let sent = 0;
    for (const tenantId of await this.tenants.ids()) {
      sent += await this.notifier.run(tenantId, now);
    }
    return sent;
  }

  protected intervalMs(): number {
    return this.config.push.intervalMs;
  }
}
