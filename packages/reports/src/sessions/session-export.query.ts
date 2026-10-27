import { and, desc, eq, gte, inArray, lt, SQL, sql } from 'drizzle-orm';
import { chargers, chargingSessions, connectors, sites, Transaction } from '@wattwisely/db';
import { SessionCsvRow } from './session-csv-row';
import { SessionExportFilter } from './session-export-filter';

/** Reads the sessions of a background export, newest first. RLS keeps it inside the tenant. */
export class SessionExportQuery {
  static readonly COLUMNS = {
    id: chargingSessions.id,
    status: chargingSessions.status,
    siteName: sites.name,
    chargerIdentity: chargers.ocppIdentity,
    connectorLabel: connectors.label,
    idTag: chargingSessions.idTag,
    startedAt: chargingSessions.startedAt,
    endedAt: chargingSessions.endedAt,
    unpluggedAt: chargingSessions.unpluggedAt,
    energyWh: chargingSessions.energyWh,
    currency: chargingSessions.currency,
    netAmount: chargingSessions.netAmount,
    taxAmount: chargingSessions.taxAmount,
    grossAmount: chargingSessions.grossAmount,
    reviewFlags: chargingSessions.reviewFlags,
    failureReason: chargingSessions.failureReason,
  };

  static rows(
    tx: Transaction,
    filter: SessionExportFilter,
    limit: number,
  ): Promise<SessionCsvRow[]> {
    return tx
      .select(SessionExportQuery.COLUMNS)
      .from(chargingSessions)
      .innerJoin(sites, eq(sites.id, chargingSessions.siteId))
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .innerJoin(connectors, eq(connectors.id, chargingSessions.connectorId))
      .where(SessionExportQuery.where(filter))
      .orderBy(desc(chargingSessions.startedAt), desc(chargingSessions.id))
      .limit(limit);
  }

  static where(filter: SessionExportFilter): SQL | undefined {
    const table = chargingSessions;
    return and(
      SessionExportQuery.scope(filter.siteIds),
      filter.siteId ? eq(table.siteId, filter.siteId) : undefined,
      filter.chargerId ? eq(table.chargerId, filter.chargerId) : undefined,
      filter.statuses?.length
        ? inArray(table.status, SessionExportQuery.states(filter))
        : undefined,
      filter.from ? gte(table.startedAt, new Date(filter.from)) : undefined,
      filter.to ? lt(table.startedAt, new Date(filter.to)) : undefined,
      filter.isReviewNeeded ? sql`jsonb_array_length(${table.reviewFlags}) > 0` : undefined,
    );
  }

  private static states(filter: SessionExportFilter) {
    return (filter.statuses ?? []) as (typeof chargingSessions.status.enumValues)[number][];
  }

  private static scope(siteIds: string[] | null): SQL | undefined {
    if (siteIds === null) {
      return undefined;
    }
    return siteIds.length > 0 ? inArray(chargingSessions.siteId, siteIds) : sql`false`;
  }
}
