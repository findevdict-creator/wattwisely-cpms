import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ManagedModule } from '../managed/managed.module';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { TeamModule } from '../team/team.module';
import { AdminAuditLogController } from './audit/admin-audit-log.controller';
import { AdminAuditLogService } from './audit/admin-audit-log.service';
import { AdminOverviewController } from './overview/admin-overview.controller';
import { AdminOverviewRepository } from './overview/admin-overview.repository';
import { AdminStaffController } from './staff/admin-staff.controller';
import { AdminStaffService } from './staff/admin-staff.service';
import { PlatformStaffRepository } from './staff/platform-staff.repository';
import { StaffWriter } from './staff/staff.writer';
import { AdminOwnersController } from './tenants/admin-owners.controller';
import { AdminOwnersService } from './tenants/admin-owners.service';
import { AdminTenantDescriber } from './tenants/admin-tenant.describer';
import { AdminTenantPlanController } from './tenants/admin-tenant-plan.controller';
import { AdminTenantPlanService } from './tenants/admin-tenant-plan.service';
import { AdminTenantsController } from './tenants/admin-tenants.controller';
import { AdminTenantsRepository } from './tenants/admin-tenants.repository';
import { AdminTenantsService } from './tenants/admin-tenants.service';
import { OwnerInviter } from './tenants/owner-inviter';
import { TenantCreationService } from './tenants/tenant-creation.service';
import { TenantCreator } from './tenants/tenant-creator';
import { TenantEntitlementsWriter } from './tenants/tenant-entitlements.writer';
import { TenantLifecycleService } from './tenants/tenant-lifecycle.service';
import { TenantPlanWriter } from './tenants/tenant-plan.writer';

/**
 * The admin console's API (module 9): tenants and their plans, Wattwisely staff, the
 * platform overview and the audit log across tenants. Plans and add-ons themselves are
 * the plans module. Every route here is marked RouteAccess.platform().
 */
@Module({
  imports: [PlansModule, SubscriptionModule, TeamModule, AuditLogModule, ManagedModule],
  controllers: [
    AdminTenantsController,
    AdminTenantPlanController,
    AdminOwnersController,
    AdminStaffController,
    AdminOverviewController,
    AdminAuditLogController,
  ],
  providers: [
    AdminTenantsRepository,
    AdminTenantDescriber,
    AdminTenantsService,
    TenantCreator,
    TenantCreationService,
    TenantLifecycleService,
    TenantEntitlementsWriter,
    TenantPlanWriter,
    AdminTenantPlanService,
    OwnerInviter,
    AdminOwnersService,
    PlatformStaffRepository,
    StaffWriter,
    AdminStaffService,
    AdminOverviewRepository,
    AdminAuditLogService,
  ],
})
export class AdminModule {}
