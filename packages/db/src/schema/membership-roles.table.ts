import { foreignKey, index, pgPolicy, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles.table';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { tenantMemberships } from './tenant-memberships.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A role given to a member, for the whole tenant (site_id empty) or for one site.
 * A Technician on two sites has two rows. (tenant_id, site_id) must be a site of the
 * same tenant; when site_id is empty the key is not checked.
 */
export const membershipRoles = pgTable(
  'membership_roles',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    membershipId: uuid('membership_id').notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    siteId: uuid('site_id'),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'membership_roles_membership_fk',
      columns: [table.tenantId, table.membershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'membership_roles_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    unique('membership_roles_unique')
      .on(table.membershipId, table.roleId, table.siteId)
      .nullsNotDistinct(),
    index('membership_roles_membership_idx').on(table.tenantId, table.membershipId),
    pgPolicy('membership_roles_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
