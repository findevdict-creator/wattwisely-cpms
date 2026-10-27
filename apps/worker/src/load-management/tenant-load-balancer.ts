import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AddonEntitlement } from '../jobs/addon-entitlement';
import { LoadManagementRepository, LoadPolicyRow } from './load-management.repository';
import { SiteLoadBalancer } from './site-load-balancer';

/**
 * One tenant, one round (module 17): with the add-on, every site whose policy is on is
 * balanced; a site whose policy is off, or every site once the add-on has run out, has its
 * caps released. All of it in the tenant's one transaction.
 */
@Injectable()
export class TenantLoadBalancer {
  static readonly FEATURE_KEY = 'load_management';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly entitlement: AddonEntitlement,
    private readonly repository: LoadManagementRepository,
    private readonly balancer: SiteLoadBalancer,
  ) {}

  /** Returns how many commands went out. */
  run(tenantId: string, now: Date): Promise<number> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      const isEntitled = await this.entitlement.has(tx, tenantId, TenantLoadBalancer.FEATURE_KEY);
      let sent = 0;
      for (const policy of await this.repository.policies(tx)) {
        sent += await this.handle(tx, tenantId, policy, { isEntitled, now });
      }
      return sent;
    });
  }

  private handle(
    tx: Transaction,
    tenantId: string,
    policy: LoadPolicyRow,
    run: { isEntitled: boolean; now: Date },
  ): Promise<number> {
    if (run.isEntitled && policy.isEnabled) {
      return this.balancer.balance(tx, tenantId, policy, run.now);
    }
    return this.balancer.release(tx, tenantId, policy.siteId);
  }
}
