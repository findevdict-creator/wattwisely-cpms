import { sql } from 'drizzle-orm';
import { integer, pgPolicy, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { platformRole } from './enums';
import { managedServices } from './managed-services.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * Wattwisely's own staff and their role in the admin console (module 9). A person has at
 * most one row; removing them keeps the row with `removed_at` for the audit log. A staff
 * member may read their own row (to learn their role); the admin console reads and
 * writes all of them; a managed tenant reads its account manager's row (module 10).
 * Holding a row gives no access to any tenant's data by itself.
 */
export const platformStaff = pgTable(
  'platform_staff',
  {
    id: uuid('id').primaryKey(),
    userAccountId: uuid('user_account_id')
      .notNull()
      .unique()
      .references(() => userAccounts.id),
    role: platformRole('role').notNull(),
    grantedBy: uuid('granted_by').references(() => userAccounts.id),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedBy: uuid('removed_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    pgPolicy('platform_staff_visible', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${RowLevelSecurity.isCurrentUserAccount(table.userAccountId)} or ${RowLevelSecurity.isPlatformAccess()}`,
    }),
    // The tenant sees who its account manager is (name and e-mail come from user_accounts).
    pgPolicy('platform_staff_account_manager_visible', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.id} in (select ${managedServices.accountManagerId} from ${managedServices} where ${RowLevelSecurity.isCurrentTenant(managedServices.tenantId)})`,
    }),
    pgPolicy('platform_staff_platform_insert', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
    pgPolicy('platform_staff_platform_update', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
