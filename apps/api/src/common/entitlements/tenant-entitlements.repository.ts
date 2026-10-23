import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { plans, tenantEntitlements, tenantSubscriptions, Transaction } from '@wattwisely/db';
import { EntitlementRecord, PlanSummary, TenantEntitlements } from './tenant-entitlements';

/**
 * Reads a tenant's plan and entitlements. Inside a tenant's transaction row-level security
 * shows that tenant's rows only; the admin console reads any tenant's with platform access.
 */
@Injectable()
export class TenantEntitlementsRepository {
  async load(tx: Transaction, tenantId: string): Promise<TenantEntitlements> {
    const [subscription] = await tx
      .select({
        status: tenantSubscriptions.status,
        plan: {
          id: plans.id,
          code: plans.code,
          name: plans.name,
          connectorLimit: plans.connectorLimit,
          userLimit: plans.userLimit,
          moduleKeys: plans.moduleKeys,
        },
      })
      .from(tenantSubscriptions)
      .innerJoin(plans, eq(plans.id, tenantSubscriptions.planId))
      .where(eq(tenantSubscriptions.tenantId, tenantId));
    const entitlements = await this.findEntitlements(tx, tenantId);
    const plan: PlanSummary | null = subscription?.plan ?? null;
    return new TenantEntitlements(plan, subscription?.status ?? null, entitlements);
  }

  async findEntitlements(tx: Transaction, tenantId: string): Promise<EntitlementRecord[]> {
    return tx
      .select({
        featureKey: tenantEntitlements.featureKey,
        source: tenantEntitlements.source,
        isEnabled: tenantEntitlements.isEnabled,
        endsAt: tenantEntitlements.endsAt,
      })
      .from(tenantEntitlements)
      .where(eq(tenantEntitlements.tenantId, tenantId));
  }
}
