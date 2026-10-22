import { inArray, sql, SQL } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { SiteScope } from '../permissions/site-scope';

/**
 * Turns a site scope into a WHERE condition on a site_id column, so lists, counts and
 * searches only return rows at sites the caller may see (Functional Design, "Site scope").
 */
export class SiteScopeCondition {
  /** No condition for the whole tenant; `site_id in (…)` for some sites; false for none. */
  static on(column: AnyPgColumn, scope: SiteScope): SQL | undefined {
    if (scope.isWholeTenant) {
      return undefined;
    }
    const siteIds = scope.toSiteIds() ?? [];
    return siteIds.length > 0 ? inArray(column, siteIds) : sql`false`;
  }
}
