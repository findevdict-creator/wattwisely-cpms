import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, ilike, inArray, isNull, or, sql, SQL } from 'drizzle-orm';
import { chargers, sites } from '@wattwisely/db';
import { SiteScopeCondition } from '../../../common/database/site-scope.condition';
import { Transaction } from '../../../common/database/transaction-runner';
import { ListCursor } from '../../../common/paging/list-cursor';
import { SiteScope } from '../../../common/permissions/site-scope';
import { ChargerRecord } from './charger-record';
import { ChargerStatus, ChargerStatusSql } from './charger-status';

/** How a chargers list is narrowed: the caller's scope first, then their filters. */
export interface ChargerFilter {
  scope: SiteScope;
  siteId?: string;
  statuses?: ChargerStatus[];
  ocppVersion?: '1.6' | '2.0.1';
  authMode?: 'password' | 'none';
  vendor?: string;
  q?: string;
}

/** Reads and writes the chargers table. RLS limits every query to the current tenant; removed chargers are left out. */
@Injectable()
export class ChargersRepository {
  static readonly COLUMNS = {
    id: chargers.id,
    siteId: chargers.siteId,
    siteName: sites.name,
    ocppIdentity: chargers.ocppIdentity,
    vendor: chargers.vendor,
    model: chargers.model,
    authMode: chargers.authMode,
    allowPlainWs: chargers.allowPlainWs,
    visibilityOverride: chargers.visibilityOverride,
    siteVisibility: sites.visibility,
    status: sql<ChargerStatus>`${ChargerStatusSql.expression()}`,
    ocppVersion: chargers.ocppVersion,
    chargePointSerial: chargers.chargePointSerial,
    chargeBoxSerial: chargers.chargeBoxSerial,
    firmwareVersion: chargers.firmwareVersion,
    bootFingerprint: chargers.bootFingerprint,
    registrationStatus: chargers.registrationStatus,
    lastBootAt: chargers.lastBootAt,
    lastSeenAt: chargers.lastSeenAt,
    version: chargers.version,
    createdAt: chargers.createdAt,
    updatedAt: chargers.updatedAt,
  };

  async findPage(
    tx: Transaction,
    filter: ChargerFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<ChargerRecord[]> {
    return this.select(tx)
      .where(and(isNull(chargers.deletedAt), ...ChargersRepository.conditions(filter, cursor)))
      .orderBy(asc(sql`lower(${chargers.ocppIdentity})`), asc(chargers.id))
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<ChargerRecord | null> {
    const rows = await this.select(tx).where(and(eq(chargers.id, id), isNull(chargers.deletedAt)));
    return rows[0] ?? null;
  }

  /** For the OCPP gateway: the charger behind an identity, before its tenant is known (identity session). */
  async findByIdentity(
    tx: Transaction,
    identity: string,
  ): Promise<{ id: string; tenantId: string; passwordHash: string | null } | null> {
    const rows = await tx
      .select({ id: chargers.id, tenantId: chargers.tenantId, passwordHash: chargers.passwordHash })
      .from(chargers)
      .where(
        and(
          eq(sql`lower(${chargers.ocppIdentity})`, identity.toLowerCase()),
          isNull(chargers.deletedAt),
        ),
      );
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof chargers.$inferInsert): Promise<void> {
    await tx.insert(chargers).values(row);
  }

  /** Applies the change only when the row still has the version the client saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof chargers.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(chargers)
      .set({ ...changes, version: version + 1 })
      .where(and(eq(chargers.id, id), eq(chargers.version, version), isNull(chargers.deletedAt)))
      .returning({ id: chargers.id });
    return rows.length === 1;
  }

  private select(tx: Transaction) {
    return tx
      .select(ChargersRepository.COLUMNS)
      .from(chargers)
      .innerJoin(sites, eq(sites.id, chargers.siteId));
  }

  private static conditions(filter: ChargerFilter, cursor: ListCursor | null): (SQL | undefined)[] {
    const search = filter.q ? `%${filter.q.replace(/[%_\\]/g, '\\$&')}%` : undefined;
    return [
      SiteScopeCondition.on(chargers.siteId, filter.scope),
      filter.siteId ? eq(chargers.siteId, filter.siteId) : undefined,
      filter.statuses ? inArray(ChargerStatusSql.expression(), filter.statuses) : undefined,
      filter.ocppVersion ? eq(chargers.ocppVersion, filter.ocppVersion) : undefined,
      filter.authMode ? eq(chargers.authMode, filter.authMode) : undefined,
      filter.vendor ? ilike(chargers.vendor, filter.vendor) : undefined,
      search ? ChargersRepository.matches(search) : undefined,
      cursor ? ChargersRepository.after(cursor) : undefined,
    ];
  }

  private static matches(search: string): SQL | undefined {
    return or(
      ilike(chargers.ocppIdentity, search),
      ilike(chargers.chargePointSerial, search),
      ilike(chargers.chargeBoxSerial, search),
      ilike(sites.name, search),
    );
  }

  private static after(cursor: ListCursor): SQL {
    return gt(
      sql`(lower(${chargers.ocppIdentity}), ${chargers.id})`,
      sql`(${cursor.key}, ${cursor.id}::uuid)`,
    );
  }
}
