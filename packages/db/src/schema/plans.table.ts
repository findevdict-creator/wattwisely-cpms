import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgPolicy, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * The plan catalogue (PRD section 7, "Proposed launch plans"): what a tenant pays Wattwisely
 * each month and which modules it gets. A global table: every tenant may read its own plan,
 * only the admin console changes rows (module 9). Money is in minor units of `currency`.
 * A plan is never deleted: `is_active` false hides it from new tenants.
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey(),
    /** Stable short name, e.g. "starter". */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    currency: text('currency').notNull().default('USD'),
    /** Per month, whatever the size. */
    platformFee: integer('platform_fee').notNull().default(0),
    acConnectorFee: integer('ac_connector_fee').notNull().default(0),
    dcConnectorFee: integer('dc_connector_fee').notNull().default(0),
    /** Share of charging revenue in basis points (500 = 5 %). */
    revenueShareBps: integer('revenue_share_bps').notNull().default(0),
    /** Empty means unlimited. */
    connectorLimit: integer('connector_limit'),
    userLimit: integer('user_limit'),
    /** Keys of the plan-gated modules included (see the API's ModuleCatalog); core modules are in every plan. */
    moduleKeys: jsonb('module_keys').$type<string[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    check('plans_currency_code', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'plans_fees_positive',
      sql`${table.platformFee} >= 0 and ${table.acConnectorFee} >= 0 and ${table.dcConnectorFee} >= 0`,
    ),
    check('plans_revenue_share_range', sql`${table.revenueShareBps} between 0 and 10000`),
    check(
      'plans_limits_positive',
      sql`(${table.connectorLimit} is null or ${table.connectorLimit} > 0) and (${table.userLimit} is null or ${table.userLimit} > 0)`,
    ),
    pgPolicy('plans_visible', { for: 'select', to: RowLevelSecurity.APP_ROLE, using: sql`true` }),
    pgPolicy('plans_platform_insert', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
    pgPolicy('plans_platform_update', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
