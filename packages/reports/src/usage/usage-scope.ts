import { and, eq, inArray, SQL, sql } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { UsageRequest } from './usage-request';

/** The caller's sites, and the one site asked for, as a condition on a site_id column. */
export class UsageScope {
  static on(column: AnyPgColumn, request: UsageRequest): SQL {
    return (
      and(
        UsageScope.sites(column, request.siteIds),
        request.siteId ? eq(column, request.siteId) : undefined,
      ) ?? sql`true`
    );
  }

  /** The end of the counted period: the period's end, or now if that is still to come. */
  static end(request: UsageRequest): Date {
    return request.to.getTime() > request.now.getTime() ? request.now : request.to;
  }

  private static sites(column: AnyPgColumn, siteIds: string[] | null): SQL | undefined {
    if (siteIds === null) {
      return undefined;
    }
    return siteIds.length > 0 ? inArray(column, siteIds) : sql`false`;
  }
}
