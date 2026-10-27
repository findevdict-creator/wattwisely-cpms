import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { WebhookDeliverer } from './webhook-deliverer';

/** WebhookDeliveryJob (module 16): every few seconds, sends the deliveries that are due and records the answers. */
@Injectable()
export class WebhookDeliveryJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly deliverer: WebhookDeliverer,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let sent = 0;
    for (const tenantId of await this.tenants.ids()) {
      sent += await this.deliverer.deliverDue(tenantId, now);
    }
    return sent;
  }

  protected intervalMs(): number {
    return this.config.webhookIntervalMs;
  }
}
