import { and, desc, eq, gte, inArray, lt, SQL, sql } from 'drizzle-orm';
import { chargingSessions } from '@wattwisely/db';
import { SessionState } from '@wattwisely/session-engine';
import { SiteScopeCondition } from '../../common/database/site-scope.condition';
import { ListCursor } from '../../common/paging/list-cursor';
import { SiteScope } from '../../common/permissions/site-scope';

/** How a session list or export is narrowed. Sessions outside the caller's scope never show. */
export interface SessionFilter {
  scope: SiteScope;
  siteId?: string;
  chargerId?: string;
  /** Only the sessions a driver's cards started (module 13). */
  driverId?: string;
  statuses?: SessionState[];
  /** Started at or after. */
  from?: Date;
  /** Started before. */
  to?: Date;
  /** Only sessions with review flags. */
  isReviewNeeded?: boolean;
}

/** The filter as a WHERE condition and the newest-first order, shared by the list and the export. */
export class SessionConditions {
  static readonly ORDER = [desc(chargingSessions.startedAt), desc(chargingSessions.id)];

  static of(filter: SessionFilter, cursor: ListCursor | null = null): SQL | undefined {
    const table = chargingSessions;
    return and(
      SiteScopeCondition.on(table.siteId, filter.scope),
      filter.siteId ? eq(table.siteId, filter.siteId) : undefined,
      filter.chargerId ? eq(table.chargerId, filter.chargerId) : undefined,
      filter.driverId ? eq(table.driverId, filter.driverId) : undefined,
      filter.statuses ? inArray(table.status, filter.statuses) : undefined,
      filter.from ? gte(table.startedAt, filter.from) : undefined,
      filter.to ? lt(table.startedAt, filter.to) : undefined,
      filter.isReviewNeeded ? sql`jsonb_array_length(${table.reviewFlags}) > 0` : undefined,
      cursor
        ? sql`(${table.startedAt}, ${table.id}) < (${cursor.key}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    );
  }
}
