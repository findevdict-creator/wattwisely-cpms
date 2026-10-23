import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { NotificationSender } from './notification.sender';

/**
 * NotificationSendJob (module 11): every 15 seconds, sends the e-mails in the outbox whose
 * time has come, at most 100 per tenant per run so one busy tenant cannot hold up the rest.
 */
@Injectable()
export class NotificationSendJob extends IntervalJob {
  static readonly BATCH = 100;

  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly sender: NotificationSender,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let handled = 0;
    for (const tenantId of await this.tenants.ids()) {
      for (let count = 0; count < NotificationSendJob.BATCH; count += 1) {
        if (!(await this.sender.sendNext(tenantId, now))) {
          break;
        }
        handled += 1;
      }
    }
    return handled;
  }

  protected intervalMs(): number {
    return this.config.notificationSendIntervalMs;
  }
}
