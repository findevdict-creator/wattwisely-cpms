import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, pgPolicy, pgTable, uuid } from 'drizzle-orm/pg-core';
import { alertType } from './enums';
import { roles } from './roles.table';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { tenantMemberships } from './tenant-memberships.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * Who hears about which alerts (story NTF-03): one row routes an alert type, at every site or
 * one, to everyone holding a role or to one named member, by e-mail, in the portal or both.
 * A tenant without any row uses the defaults in the code; once an Owner saves the routing,
 * the rows are the whole truth. Recipients still need alerts:read at the alert's site.
 */
export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    alertType: alertType('alert_type').notNull(),
    /** Empty for every site. */
    siteId: uuid('site_id'),
    /** Exactly one of the two: everyone holding this role, or this one member. */
    roleId: uuid('role_id').references(() => roles.id),
    membershipId: uuid('membership_id'),
    isEmail: boolean('is_email').notNull().default(true),
    isInPortal: boolean('is_in_portal').notNull().default(true),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'alert_rules_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    foreignKey({
      name: 'alert_rules_membership_fk',
      columns: [table.tenantId, table.membershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }),
    check(
      'alert_rules_one_recipient',
      sql`(${table.roleId} is null) <> (${table.membershipId} is null)`,
    ),
    check('alert_rules_some_channel', sql`${table.isEmail} or ${table.isInPortal}`),
    index('alert_rules_type_idx').on(table.tenantId, table.alertType),
    pgPolicy('alert_rules_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
