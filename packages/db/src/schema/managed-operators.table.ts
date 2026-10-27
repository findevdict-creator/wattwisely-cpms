import { foreignKey, index, pgPolicy, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { managedServices } from './managed-services.table';
import { RowLevelSecurity } from './row-level-security';
import { tenantMemberships } from './tenant-memberships.table';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A Wattwisely staff member working inside a managed tenant as its Managed operator (story
 * MGT-02). The assignment points at the membership that carries the Managed operator role,
 * so the admin console can find every tenant a staff member works in without reading
 * tenant memberships across tenants, and the worker can remove them all when the service
 * ends. Removing an assignment keeps the row with `removed_at`. The tenant reads its own
 * rows (the portal shows who looks after it); the admin console reads and writes all of them.
 */
export const managedOperators = pgTable(
  'managed_operators',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    managedServiceId: uuid('managed_service_id')
      .notNull()
      .references(() => managedServices.id),
    userAccountId: uuid('user_account_id')
      .notNull()
      .references(() => userAccounts.id),
    membershipId: uuid('membership_id').notNull(),
    assignedBy: uuid('assigned_by').references(() => userAccounts.id),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedBy: uuid('removed_by').references(() => userAccounts.id),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'managed_operators_membership_fk',
      columns: [table.tenantId, table.membershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }),
    // One live assignment per person and tenant; removed rows keep their history.
    unique('managed_operators_live_unique')
      .on(table.tenantId, table.userAccountId, table.removedAt)
      .nullsNotDistinct(),
    index('managed_operators_user_idx').on(table.userAccountId),
    pgPolicy('managed_operators_tenant_read', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    pgPolicy('managed_operators_platform_all', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
