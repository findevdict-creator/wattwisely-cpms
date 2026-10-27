import {
  boolean,
  foreignKey,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { loadStrategy } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * How a site shares its grid connection among its chargers (module 17, the load management
 * add-on). One row per site that has a policy. While `is_enabled`, the worker keeps the
 * chargers' power caps (OCPP charging profiles) adding up to `limit_kw`: every charging
 * charger gets at least `min_power_kw`, idle chargers a reserve so a car can start, and the
 * rest is shared equally or by priority. The site's `power_limit_kw` is what the grid allows;
 * this cap can sit below it.
 */
export const siteLoadPolicies = pgTable(
  'site_load_policies',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    siteId: uuid('site_id').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    /** The cap shared across the site's chargers. */
    limitKw: numeric('limit_kw', { precision: 8, scale: 1, mode: 'number' }).notNull(),
    strategy: loadStrategy('strategy').notNull().default('equal_share'),
    /** What a charging charger is never pushed below; most cars stop at less than 6 A per phase. */
    minPowerKw: numeric('min_power_kw', { precision: 6, scale: 1, mode: 'number' })
      .notNull()
      .default(4.2),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('site_load_policies_site_unique').on(table.tenantId, table.siteId),
    foreignKey({
      name: 'site_load_policies_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    pgPolicy('site_load_policies_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
