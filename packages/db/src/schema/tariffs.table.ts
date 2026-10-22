import { sql } from 'drizzle-orm';
import {
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tariffStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A named price list a tenant assigns to sites, e.g. "Standard AC". The prices live in
 * immutable versions (tariff_versions); the highest version number is the one in force.
 * A session keeps the version it started under, so a price change never touches a
 * session that is already running.
 */
export const tariffs = pgTable(
  'tariffs',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    /** ISO 4217 code. Fixed for the tariff's life; every version prices in it. */
    currency: text('currency').notNull(),
    status: tariffStatus('status').notNull().default('active'),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('tariffs_tenant_id_unique').on(table.tenantId, table.id),
    // A name is unique within the tenant among tariffs that are not archived.
    uniqueIndex('tariffs_name_unique')
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.status} = 'active'`),
    pgPolicy('tariffs_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
