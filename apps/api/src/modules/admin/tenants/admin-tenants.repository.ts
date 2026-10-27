import { Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, or, SQL, sql } from 'drizzle-orm';
import { plans, tenants, tenantSubscriptions, Transaction } from '@wattwisely/db';
import { ListCursor } from '../../../common/paging/list-cursor';
import { TenantOverviewRepository } from '../../subscription/tenant-overview.repository';
import { AdminTenantRecord, TenantRecord } from './admin-tenant-record';
import { ListAdminTenantsQueryDto } from './dto/list-admin-tenants-query.dto';

/** Reads and writes tenants for the admin console (platform access: every tenant is visible). */
@Injectable()
export class AdminTenantsRepository {
  constructor(private readonly overview: TenantOverviewRepository) {}

  async findPage(
    tx: Transaction,
    query: ListAdminTenantsQueryDto,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<AdminTenantRecord[]> {
    const rows = await this.select(tx)
      .where(and(...AdminTenantsRepository.conditions(query, cursor)))
      .orderBy(asc(sql`lower(${tenants.name})`), asc(tenants.id))
      .limit(limit);
    const overviews = await this.overview.findAll(tx);
    return rows.map((row) => ({
      ...row,
      overview: overviews.get(row.tenant.id) ?? {
        tenantId: row.tenant.id,
        ...TenantOverviewRepository.EMPTY,
      },
    }));
  }

  async findById(tx: Transaction, id: string): Promise<AdminTenantRecord | null> {
    const rows = await this.select(tx).where(eq(tenants.id, id));
    if (!rows[0]) {
      return null;
    }
    return { ...rows[0], overview: await this.overview.findByTenant(tx, id) };
  }

  async insert(tx: Transaction, row: typeof tenants.$inferInsert): Promise<void> {
    await tx.insert(tenants).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<TenantRecord>,
  ): Promise<boolean> {
    const rows = await tx
      .update(tenants)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(tenants.id, id), eq(tenants.version, version)))
      .returning({ id: tenants.id });
    return rows.length === 1;
  }

  private select(tx: Transaction) {
    return tx
      .select({
        tenant: tenants,
        plan: { id: plans.id, code: plans.code, name: plans.name },
        subscriptionStatus: tenantSubscriptions.status,
      })
      .from(tenants)
      .leftJoin(tenantSubscriptions, eq(tenantSubscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(plans.id, tenantSubscriptions.planId));
  }

  private static conditions(
    query: ListAdminTenantsQueryDto,
    cursor: ListCursor | null,
  ): (SQL | undefined)[] {
    const search = query.q ? `%${query.q.replace(/[%_\\]/g, '\\$&')}%` : undefined;
    return [
      query.status ? eq(tenants.status, query.status) : undefined,
      query.plan ? eq(plans.code, query.plan) : undefined,
      search ? or(ilike(tenants.name, search), ilike(tenants.slug, search)) : undefined,
      cursor
        ? sql`(lower(${tenants.name}), ${tenants.id}) > (${cursor.key}, ${cursor.id}::uuid)`
        : undefined,
    ];
  }
}
