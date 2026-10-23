import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { platformTenantOverview, Transaction } from '@wattwisely/db';

/** What the platform_tenant_overview view counts for one tenant. */
export type TenantOverviewRecord = typeof platformTenantOverview.$inferSelect;

/**
 * Reads the platform_tenant_overview view (migration 0014): members, sites, chargers and
 * connectors per tenant, counted by the database across every tenant. A tenant asks for
 * its own row (the Plan page); the admin console reads them all.
 */
@Injectable()
export class TenantOverviewRepository {
  static readonly EMPTY: Omit<TenantOverviewRecord, 'tenantId'> = {
    memberCount: 0,
    invitedCount: 0,
    siteCount: 0,
    chargerCount: 0,
    acConnectorCount: 0,
    dcConnectorCount: 0,
    lastSessionAt: null,
  };

  async findByTenant(tx: Transaction, tenantId: string): Promise<TenantOverviewRecord> {
    const rows = await tx
      .select()
      .from(platformTenantOverview)
      .where(eq(platformTenantOverview.tenantId, tenantId));
    return rows[0] ?? { tenantId, ...TenantOverviewRepository.EMPTY };
  }

  async findAll(tx: Transaction): Promise<Map<string, TenantOverviewRecord>> {
    const rows = await tx.select().from(platformTenantOverview);
    return new Map(rows.map((row) => [row.tenantId, row]));
  }
}
