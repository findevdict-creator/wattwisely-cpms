import { Module } from '@nestjs/common';
import { AddonEntitlement } from '../jobs/addon-entitlement';
import { TenantIterator } from '../jobs/tenant-iterator';
import { AllocationReconciler } from './allocation-reconciler';
import { LoadBalanceJob } from './load-balance.job';
import { LoadCommandQueue } from './load-command-queue';
import { LoadManagementRepository } from './load-management.repository';
import { SiteLoadBalancer } from './site-load-balancer';
import { TenantLoadBalancer } from './tenant-load-balancer';

/** The load management add-on's job (module 17): sharing each site's cap among its chargers. */
@Module({
  providers: [
    TenantIterator,
    AddonEntitlement,
    LoadManagementRepository,
    LoadCommandQueue,
    AllocationReconciler,
    SiteLoadBalancer,
    TenantLoadBalancer,
    LoadBalanceJob,
  ],
  exports: [AddonEntitlement],
})
export class LoadManagementModule {}
