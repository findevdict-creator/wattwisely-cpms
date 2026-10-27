import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { TenantLoadBalancer } from './tenant-load-balancer';

/**
 * LoadBalanceJob (module 17): every few seconds, for every tenant with the load management
 * add-on, shares each managed site's cap among its chargers and sends the caps that changed.
 */
@Injectable()
export class LoadBalanceJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly balancer: TenantLoadBalancer,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let sent = 0;
    for (const tenantId of await this.tenants.ids()) {
      sent += await this.balancer.run(tenantId, now);
    }
    return sent;
  }

  protected intervalMs(): number {
    return this.config.loadManagementIntervalMs;
  }
}
