import { and, desc, eq, sql, SQL } from 'drizzle-orm';
import { alerts } from '@wattwisely/db';
import { SiteScopeCondition } from '../../common/database/site-scope.condition';
import { ListCursor } from '../../common/paging/list-cursor';
import { SiteScope } from '../../common/permissions/site-scope';
import { AlertStatus, AlertType } from './alert-types';

/** How the alert list is narrowed; alerts outside the caller's sites never show. */
export interface AlertFilter {
  scope: SiteScope;
  status?: AlertStatus;
  type?: AlertType;
  siteId?: string;
  chargerId?: string;
}

/** The filter as a WHERE condition, and the newest-first order. */
export class AlertConditions {
  static readonly ORDER = [desc(alerts.openedAt), desc(alerts.id)];

  static of(filter: AlertFilter, cursor: ListCursor | null = null): SQL | undefined {
    return and(
      SiteScopeCondition.on(alerts.siteId, filter.scope),
      filter.status ? eq(alerts.status, filter.status) : undefined,
      filter.type ? eq(alerts.type, filter.type) : undefined,
      filter.siteId ? eq(alerts.siteId, filter.siteId) : undefined,
      filter.chargerId ? eq(alerts.chargerId, filter.chargerId) : undefined,
      cursor
        ? sql`(${alerts.openedAt}, ${alerts.id}) < (${cursor.key}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    );
  }
}
