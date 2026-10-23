import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenantMemberships } from './tenant-memberships.table';
import { Timestamps } from './timestamps';

/**
 * A team member's quiet hours (story NTF-03): no alert e-mail between the two local times,
 * except for a faulted connector. The e-mail waits until the quiet hours end and is dropped
 * if the alert closed meanwhile; in-portal notifications arrive as usual. One row per member
 * of a tenant, created the first time they save; without a row there are no quiet hours.
 */
export const memberNotificationSettings = pgTable(
  'member_notification_settings',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    membershipId: uuid('membership_id').notNull(),
    /** Local times "HH:MM"; an end before the start wraps past midnight. Both empty: no quiet hours. */
    quietHoursStart: text('quiet_hours_start'),
    quietHoursEnd: text('quiet_hours_end'),
    /** The IANA time zone the two times are read in. */
    timeZone: text('time_zone').notNull().default('UTC'),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('member_notification_settings_member_unique').on(table.tenantId, table.membershipId),
    foreignKey({
      name: 'member_notification_settings_membership_fk',
      columns: [table.tenantId, table.membershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }),
    check(
      'member_notification_settings_quiet_hours_pair',
      sql`(${table.quietHoursStart} is null) = (${table.quietHoursEnd} is null)`,
    ),
    pgPolicy('member_notification_settings_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
