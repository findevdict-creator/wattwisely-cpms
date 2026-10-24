import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * Named bundles of permissions.
 * System roles (Owner, Operations, Finance, Technician, Read-only, Managed operator) are
 * shared by every tenant: they have no tenant_id and are created by migrations, so a
 * migration that changes one changes it everywhere. Custom roles (module 14) belong to one
 * tenant, which creates, edits and deletes them itself; their names are unique per tenant.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    /** Stable name for system roles, e.g. "owner". Empty for custom roles. */
    key: text('key').unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    isSystem: boolean('is_system').notNull(),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    check(
      'roles_system_or_tenant',
      sql`(${table.isSystem} and ${table.tenantId} is null and ${table.key} is not null)
        or (not ${table.isSystem} and ${table.tenantId} is not null)`,
    ),
    uniqueIndex('roles_tenant_name_unique')
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.tenantId} is not null`),
    pgPolicy('roles_visible', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.tenantId} is null or ${RowLevelSecurity.isCurrentTenant(table.tenantId)}`,
    }),
    /** A tenant changes its own custom roles only; system roles stay with the migrations. */
    pgPolicy('roles_tenant_changes', {
      for: 'all',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`not ${table.isSystem} and ${RowLevelSecurity.isCurrentTenant(table.tenantId)}`,
      withCheck: sql`not ${table.isSystem} and ${RowLevelSecurity.isCurrentTenant(table.tenantId)}`,
    }),
  ],
);
