import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { alerts, chargers, sites, Transaction, userAccounts } from '@wattwisely/db';
import { ListCursor } from '../../common/paging/list-cursor';
import { SiteScopeCondition } from '../../common/database/site-scope.condition';
import { SiteScope } from '../../common/permissions/site-scope';
import { AlertConditions, AlertFilter } from './alert-filter';
import { AlertRecord } from './alert-record';

/** Reads and acknowledges alerts. RLS keeps every query inside the current tenant. */
@Injectable()
export class AlertsRepository {
  static readonly COLUMNS = {
    id: alerts.id,
    type: alerts.type,
    status: alerts.status,
    title: alerts.title,
    details: alerts.details,
    siteId: alerts.siteId,
    siteName: sites.name,
    chargerId: alerts.chargerId,
    chargerIdentity: chargers.ocppIdentity,
    connectorId: alerts.connectorId,
    sessionId: alerts.sessionId,
    beganAt: alerts.beganAt,
    openedAt: alerts.openedAt,
    lastSeenAt: alerts.lastSeenAt,
    occurrences: alerts.occurrences,
    acknowledgedByName: sql<
      string | null
    >`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
    acknowledgedAt: alerts.acknowledgedAt,
    acknowledgeNote: alerts.acknowledgeNote,
    closedAt: alerts.closedAt,
    closeReason: alerts.closeReason,
    version: alerts.version,
  };

  async findPage(
    tx: Transaction,
    filter: AlertFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<AlertRecord[]> {
    return this.select(tx)
      .where(AlertConditions.of(filter, cursor))
      .orderBy(...AlertConditions.ORDER)
      .limit(limit);
  }

  async findById(tx: Transaction, id: string): Promise<AlertRecord | null> {
    const rows = await this.select(tx).where(eq(alerts.id, id));
    return rows[0] ?? null;
  }

  /** How many alerts are open and acknowledged at the caller's sites: the badge in the portal. */
  async countLive(
    tx: Transaction,
    scope: SiteScope,
  ): Promise<{ open: number; acknowledged: number }> {
    const [row] = await tx
      .select({
        open: sql<number>`count(*) filter (where ${alerts.status} = 'open')::int`,
        acknowledged: sql<number>`count(*) filter (where ${alerts.status} = 'acknowledged')::int`,
      })
      .from(alerts)
      .where(SiteScopeCondition.on(alerts.siteId, scope));
    return row ?? { open: 0, acknowledged: 0 };
  }

  /** Marks an open alert as seen to; false when it was no longer open at that version. */
  async acknowledge(
    tx: Transaction,
    id: string,
    by: { accountId: string; note: string },
    version: number,
  ): Promise<boolean> {
    const now = new Date();
    const rows = await tx
      .update(alerts)
      .set({
        status: 'acknowledged',
        acknowledgedBy: by.accountId,
        acknowledgedAt: now,
        acknowledgeNote: by.note,
        version: sql`${alerts.version} + 1`,
        updatedAt: now,
      })
      .where(and(eq(alerts.id, id), eq(alerts.status, 'open'), eq(alerts.version, version)))
      .returning({ id: alerts.id });
    return rows.length === 1;
  }

  private select(tx: Transaction) {
    return tx
      .select(AlertsRepository.COLUMNS)
      .from(alerts)
      .innerJoin(sites, eq(sites.id, alerts.siteId))
      .innerJoin(chargers, eq(chargers.id, alerts.chargerId))
      .leftJoin(userAccounts, eq(userAccounts.id, alerts.acknowledgedBy))
      .$dynamic();
  }
}
