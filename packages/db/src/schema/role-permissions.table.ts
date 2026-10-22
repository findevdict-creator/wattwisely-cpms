import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles.table';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';

/** The permissions in a role, one row each, e.g. (Technician, chargers:command). */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** Same as the role's tenant_id: empty for system roles. */
    tenantId: uuid('tenant_id').references(() => tenants.id),
    permissionKey: text('permission_key').notNull(),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('role_permissions_unique').on(table.roleId, table.permissionKey),
    pgPolicy('role_permissions_visible', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.tenantId} is null or ${RowLevelSecurity.isCurrentTenant(table.tenantId)}`,
    }),
  ],
);
