import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, gt, ilike, inArray, isNull, or, sql, SQL } from 'drizzle-orm';
import { chargers, connectors, sites } from '@wattwisely/db';
import { SiteScopeCondition } from '../../../common/database/site-scope.condition';
import { Transaction } from '../../../common/database/transaction-runner';
import { ListCursor } from '../../../common/paging/list-cursor';
import { SiteScope } from '../../../common/permissions/site-scope';
import { ChargerStatusSql } from '../chargers/charger-status';
import { SiteFleet, SiteRecord } from './site-record';

/** How a sites list is narrowed: the caller's scope first, then their filters. */
export interface SiteFilter {
  scope: SiteScope;
  visibility?: 'public' | 'private';
  q?: string;
}

/** Reads and writes the sites table. RLS limits every query to the current tenant; deleted sites are left out. */
@Injectable()
export class SitesRepository {
  async findPage(
    tx: Transaction,
    filter: SiteFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<SiteRecord[]> {
    const search = filter.q ? `%${filter.q.replace(/[%_\\]/g, '\\$&')}%` : undefined;
    return tx
      .select()
      .from(sites)
      .where(
        and(
          isNull(sites.deletedAt),
          SiteScopeCondition.on(sites.id, filter.scope),
          filter.visibility ? eq(sites.visibility, filter.visibility) : undefined,
          search ? SitesRepository.matches(search) : undefined,
          cursor ? SitesRepository.after(cursor) : undefined,
        ),
      )
      .orderBy(asc(sql`lower(${sites.name})`), asc(sites.id))
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<SiteRecord | null> {
    const rows = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), isNull(sites.deletedAt)));
    return rows[0] ?? null;
  }

  /** Which of these ids are sites of the current tenant that still exist. */
  async findExistingIds(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx
      .select({ id: sites.id })
      .from(sites)
      .where(and(inArray(sites.id, ids), isNull(sites.deletedAt)));
    return new Set(rows.map((row) => row.id));
  }

  /** Chargers and connectors by status for each of these sites, in one pass. */
  async findFleets(tx: Transaction, siteIds: string[]): Promise<Map<string, SiteFleet>> {
    if (siteIds.length === 0) {
      return new Map();
    }
    const onSites = and(inArray(chargers.siteId, siteIds), isNull(chargers.deletedAt));
    const chargerRows = await tx
      .select({ siteId: chargers.siteId, status: ChargerStatusSql.expression(), total: count() })
      .from(chargers)
      .where(onSites)
      .groupBy(chargers.siteId, ChargerStatusSql.expression());
    const connectorRows = await tx
      .select({ siteId: chargers.siteId, status: connectors.status, total: count() })
      .from(connectors)
      .innerJoin(chargers, eq(chargers.id, connectors.chargerId))
      .where(onSites)
      .groupBy(chargers.siteId, connectors.status);
    return SitesRepository.groupFleets(chargerRows, connectorRows);
  }

  async countChargers(tx: Transaction, siteId: string): Promise<number> {
    const rows = await tx
      .select({ total: count() })
      .from(chargers)
      .where(and(eq(chargers.siteId, siteId), isNull(chargers.deletedAt)));
    return rows[0].total;
  }

  async insert(tx: Transaction, row: typeof sites.$inferInsert): Promise<void> {
    await tx.insert(sites).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof sites.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(sites)
      .set({ ...changes, version: version + 1 })
      .where(and(eq(sites.id, id), eq(sites.version, version), isNull(sites.deletedAt)))
      .returning({ id: sites.id });
    return rows.length === 1;
  }

  private static groupFleets(
    chargerRows: { siteId: string; status: unknown; total: number }[],
    connectorRows: { siteId: string; status: string; total: number }[],
  ): Map<string, SiteFleet> {
    const fleets = new Map<string, SiteFleet>();
    const fleetOf = (siteId: string): SiteFleet => {
      const fleet = fleets.get(siteId) ?? {
        chargerCount: 0,
        chargerStatuses: {},
        connectorStatuses: {},
      };
      fleets.set(siteId, fleet);
      return fleet;
    };
    for (const row of chargerRows) {
      fleetOf(row.siteId).chargerCount += row.total;
      fleetOf(row.siteId).chargerStatuses[String(row.status)] = row.total;
    }
    for (const row of connectorRows) {
      fleetOf(row.siteId).connectorStatuses[row.status] = row.total;
    }
    return fleets;
  }

  private static matches(search: string): SQL | undefined {
    return or(
      ilike(sites.name, search),
      ilike(sql`${sites.address}->>'line1'`, search),
      ilike(sql`${sites.address}->>'city'`, search),
      ilike(sql`${sites.address}->>'postal_code'`, search),
    );
  }

  private static after(cursor: ListCursor): SQL {
    return gt(sql`(lower(${sites.name}), ${sites.id})`, sql`(${cursor.key}, ${cursor.id}::uuid)`);
  }
}
