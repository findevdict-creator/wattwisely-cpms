import { and, desc, eq, gte, inArray, lt, SQL, sql } from 'drizzle-orm';
import { chargingSessions, payments } from '@wattwisely/db';
import { PaymentStatus } from '@wattwisely/payments';
import { SiteScopeCondition } from '../../../common/database/site-scope.condition';
import { ListCursor } from '../../../common/paging/list-cursor';
import { SiteScope } from '../../../common/permissions/site-scope';

/** How a payments list is narrowed. Payments at sites outside the caller's scope never show. */
export interface PaymentFilter {
  scope: SiteScope;
  siteId?: string;
  sessionId?: string;
  statuses?: PaymentStatus[];
  /** Created at or after. */
  from?: Date;
  /** Created before. */
  to?: Date;
}

/** The filter as a WHERE condition and the newest-first order. */
export class PaymentConditions {
  static readonly ORDER = [desc(payments.createdAt), desc(payments.id)];

  static of(filter: PaymentFilter, cursor: ListCursor | null = null): SQL | undefined {
    return and(
      SiteScopeCondition.on(chargingSessions.siteId, filter.scope),
      filter.siteId ? eq(chargingSessions.siteId, filter.siteId) : undefined,
      filter.sessionId ? eq(payments.sessionId, filter.sessionId) : undefined,
      filter.statuses ? inArray(payments.status, filter.statuses) : undefined,
      filter.from ? gte(payments.createdAt, filter.from) : undefined,
      filter.to ? lt(payments.createdAt, filter.to) : undefined,
      cursor
        ? sql`(${payments.createdAt}, ${payments.id}) < (${cursor.key}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    );
  }
}
