import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { TenantEntitlementsRepository } from '../../common/entitlements/tenant-entitlements.repository';
import { AddonsRepository } from '../plans/addons.repository';
import { TenantModuleDto } from '../plans/dto/tenant-module.dto';
import { PlanUsageDto } from './dto/plan-usage.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { SubscriptionsRepository } from './subscriptions.repository';
import { TenantOverviewRepository } from './tenant-overview.repository';

/**
 * Describes one tenant's plan inside a transaction: the row, what the plan and the
 * entitlements add up to, the add-on prices and the tenant's usage. Used by the tenant's
 * own Plan page (its transaction shows its own rows) and by the admin console (platform access).
 */
@Injectable()
export class SubscriptionDescriber {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly entitlements: TenantEntitlementsRepository,
    private readonly addons: AddonsRepository,
    private readonly overview: TenantOverviewRepository,
  ) {}

  async describe(tx: Transaction, tenantId: string, isForStaff: boolean): Promise<SubscriptionDto> {
    const record = await this.subscriptions.findByTenant(tx, tenantId);
    const entitlements = await this.entitlements.load(tx, tenantId);
    const addons = await this.addons.findAll(tx);
    const overview = await this.overview.findByTenant(tx, tenantId);
    return new SubscriptionDto({
      record,
      usage: new PlanUsageDto(overview, entitlements.plan),
      modules: TenantModuleDto.listFor(entitlements, addons),
      hasNotes: isForStaff,
    });
  }
}
