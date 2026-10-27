import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { WebhookEventScanner } from './webhook-event-scanner';

/** WebhookScanJob (module 16): every few seconds, queues new session and alert events for every tenant's endpoints. */
@Injectable()
export class WebhookScanJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly scanner: WebhookEventScanner,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let queued = 0;
    for (const tenantId of await this.tenants.ids()) {
      queued += await this.scanner.scan(tenantId, now);
    }
    return queued;
  }

  protected intervalMs(): number {
    return this.config.webhookIntervalMs;
  }
}
