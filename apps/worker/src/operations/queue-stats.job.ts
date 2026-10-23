import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { QueueCounter } from './queue-counter';
import { QueueMetrics } from '../metrics/queue-metrics';

/**
 * QueueStatsJob (module 12): every 30 seconds, counts what is waiting (e-mails, exports,
 * payment webhooks, open alerts) for GET /metrics. Changes nothing, so it returns 0.
 */
@Injectable()
export class QueueStatsJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly counter: QueueCounter,
    private readonly queues: QueueMetrics,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    this.queues.set(await this.counter.count(await this.tenants.ids(), now));
    return 0;
  }

  protected intervalMs(): number {
    return this.config.queueStatsIntervalMs;
  }
}
