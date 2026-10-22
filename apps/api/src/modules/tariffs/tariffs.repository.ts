import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { sites, tariffs, tariffVersions, Transaction } from '@wattwisely/db';
import { ListCursor } from '../../common/paging/list-cursor';
import { TariffVersionRow } from './tariff-prices';
import { TariffRecord } from './tariff-record';

/** Reads and writes tariffs and their versions. RLS limits every query to the current tenant. */
@Injectable()
export class TariffsRepository {
  static readonly COLUMNS = {
    id: tariffs.id,
    name: tariffs.name,
    currency: tariffs.currency,
    status: tariffs.status,
    version: tariffs.version,
    createdAt: tariffs.createdAt,
    updatedAt: tariffs.updatedAt,
  };

  async findPage(
    tx: Transaction,
    status: 'active' | 'archived',
    cursor: ListCursor | null,
    limit: number,
  ): Promise<TariffRecord[]> {
    return tx
      .select(TariffsRepository.COLUMNS)
      .from(tariffs)
      .where(
        and(
          eq(tariffs.status, status),
          cursor
            ? sql`(lower(${tariffs.name}), ${tariffs.id}) > (${cursor.key}, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(asc(sql`lower(${tariffs.name})`), asc(tariffs.id))
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<TariffRecord | null> {
    const rows = await tx.select(TariffsRepository.COLUMNS).from(tariffs).where(eq(tariffs.id, id));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof tariffs.$inferInsert): Promise<void> {
    await tx.insert(tariffs).values(row);
  }

  /** Changes the tariff if it still has the version the caller saw; false otherwise. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof tariffs.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(tariffs)
      .set({ ...changes, version: sql`${tariffs.version} + 1`, updatedAt: new Date() })
      .where(and(eq(tariffs.id, id), eq(tariffs.version, version)))
      .returning({ id: tariffs.id });
    return rows.length === 1;
  }

  async insertVersion(tx: Transaction, row: typeof tariffVersions.$inferInsert): Promise<void> {
    await tx.insert(tariffVersions).values(row);
  }

  /** Every version of a tariff, newest first. */
  async findVersions(tx: Transaction, tariffId: string): Promise<TariffVersionRow[]> {
    return tx
      .select()
      .from(tariffVersions)
      .where(eq(tariffVersions.tariffId, tariffId))
      .orderBy(desc(tariffVersions.number));
  }

  /** The version in force (the highest number) of each of these tariffs. */
  async findCurrentVersions(
    tx: Transaction,
    tariffIds: string[],
  ): Promise<Map<string, TariffVersionRow>> {
    if (tariffIds.length === 0) {
      return new Map();
    }
    const rows = await tx
      .selectDistinctOn([tariffVersions.tariffId])
      .from(tariffVersions)
      .where(inArray(tariffVersions.tariffId, tariffIds))
      .orderBy(tariffVersions.tariffId, desc(tariffVersions.number));
    return new Map(rows.map((row) => [row.tariffId, row]));
  }

  /** How many (non-deleted) sites use each of these tariffs. */
  async countSites(tx: Transaction, tariffIds: string[]): Promise<Map<string, number>> {
    if (tariffIds.length === 0) {
      return new Map();
    }
    const rows = await tx
      .select({ tariffId: sites.tariffId, sites: count() })
      .from(sites)
      .where(and(inArray(sites.tariffId, tariffIds), isNull(sites.deletedAt)))
      .groupBy(sites.tariffId);
    return new Map(rows.map((row) => [row.tariffId as string, row.sites]));
  }
}
