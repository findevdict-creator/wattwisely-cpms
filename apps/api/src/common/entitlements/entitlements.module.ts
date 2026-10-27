import { Global, Module } from '@nestjs/common';
import { TenantEntitlementsRepository } from './tenant-entitlements.repository';

/** What every module needs to read a tenant's plan (module 9). PlanLimits needs no wiring. */
@Global()
@Module({
  providers: [TenantEntitlementsRepository],
  exports: [TenantEntitlementsRepository],
})
export class EntitlementsModule {}
