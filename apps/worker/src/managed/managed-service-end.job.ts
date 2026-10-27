import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { ManagedServiceEnder } from './managed-service.ender';

/**
 * ManagedServiceEndJob (module 10): every hour, ends the managed service agreements whose
 * notice period is over. The staff working in those tenants lose access within the
 * API's 30-second access cache; the tenant's own Owner carries on.
 */
@Injectable()
export class ManagedServiceEndJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly ender: ManagedServiceEnder,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let ended = 0;
    for (const service of await this.ender.due(now)) {
      if (await this.ender.end(service, now)) {
        ended += 1;
        this.logger.log(`Managed service ${service.id} of tenant ${service.tenantId} ended`);
      }
    }
    return ended;
  }

  protected intervalMs(): number {
    return this.config.managedServiceEndIntervalMs;
  }
}
