import { Injectable } from '@nestjs/common';
import { count, eq, isNull, sql } from 'drizzle-orm';
import {
  platformStaff,
  platformTenantOverview,
  plans,
  tenants,
  tenantSubscriptions,
  Transaction,
} from '@wattwisely/db';

/** The numbers on the admin console's start page. */
export interface OverviewCounts {
  tenantsByStatus: Map<string, number>;
  acConnectors: number;
  dcConnectors: number;
  sites: number;
  chargers: number;
  tenantsByPlan: { id: string; code: string; name: string; tenantCount: number }[];
  staff: number;
}

/** Counts across the platform (platform access). */
@Injectable()
export class AdminOverviewRepository {
  async count(tx: Transaction): Promise<OverviewCounts> {
    const byStatus = await tx
      .select({ status: tenants.status, count: count() })
      .from(tenants)
      .groupBy(tenants.status);
    const [staff] = await tx
      .select({ count: count() })
      .from(platformStaff)
      .where(isNull(platformStaff.removedAt));
    return {
      tenantsByStatus: new Map(byStatus.map((row) => [row.status, row.count])),
      ...(await AdminOverviewRepository.size(tx)),
      tenantsByPlan: await AdminOverviewRepository.byPlan(tx),
      staff: staff.count,
    };
  }

  /** Sites, chargers and connectors of tenants that are not deleted. */
  private static async size(tx: Transaction) {
    const [size] = await tx
      .select({
        acConnectors: sql<number>`coalesce(sum(${platformTenantOverview.acConnectorCount}), 0)::int`,
        dcConnectors: sql<number>`coalesce(sum(${platformTenantOverview.dcConnectorCount}), 0)::int`,
        sites: sql<number>`coalesce(sum(${platformTenantOverview.siteCount}), 0)::int`,
        chargers: sql<number>`coalesce(sum(${platformTenantOverview.chargerCount}), 0)::int`,
      })
      .from(platformTenantOverview)
      .innerJoin(tenants, eq(tenants.id, platformTenantOverview.tenantId))
      .where(isNull(tenants.deletedAt));
    return size;
  }

  private static byPlan(tx: Transaction) {
    return tx
      .select({
        id: plans.id,
        code: plans.code,
        name: plans.name,
        tenantCount: count(tenantSubscriptions.id),
      })
      .from(plans)
      .leftJoin(tenantSubscriptions, eq(tenantSubscriptions.planId, plans.id))
      .groupBy(plans.id)
      .orderBy(plans.sortOrder);
  }
}
