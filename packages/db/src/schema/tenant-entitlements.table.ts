import {
  boolean,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { entitlementSource } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A module a tenant has beyond (or despite) its plan (Architecture, "Paid add-on modules"):
 * an add-on it bought, a trial with an end date, or an override by Wattwisely staff, which
 * can also switch a plan's module off for one tenant (`is_enabled` false). One row per
 * module and tenant. Core modules and the plan's own modules are never stored here.
 */
export const tenantEntitlements = pgTable(
  'tenant_entitlements',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    /** A module key from the API's ModuleCatalog, e.g. "load_management". */
    featureKey: text('feature_key').notNull(),
    source: entitlementSource('source').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(true),
    /** When a trial ends; empty for add-ons and overrides without an end. */
    endsAt: timestamp('ends_at', { withTimezone: true }),
    note: text('note').notNull().default(''),
    grantedBy: uuid('granted_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('tenant_entitlements_feature_unique').on(table.tenantId, table.featureKey),
    pgPolicy('tenant_entitlements_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('tenant_entitlements_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
