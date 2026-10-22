import { sql } from 'drizzle-orm';
import { boolean, check, pgPolicy, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';

/**
 * Named bundles of permissions.
 * System roles (Owner, Operations, Finance, Technician, Read-only) are shared by every
 * tenant: they have no tenant_id and are created by migrations, so a migration that
 * changes one changes it everywhere. Custom roles (M2) belong to one tenant.
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
    ...Timestamps.columns(),
  },
  (table) => [
    check(
      'roles_system_or_tenant',
      sql`(${table.isSystem} and ${table.tenantId} is null and ${table.key} is not null)
        or (not ${table.isSystem} and ${table.tenantId} is not null)`,
    ),
    pgPolicy('roles_visible', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.tenantId} is null or ${RowLevelSecurity.isCurrentTenant(table.tenantId)}`,
    }),
  ],
);
