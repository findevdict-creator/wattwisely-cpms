import { foreignKey, index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tenantMemberships } from './tenant-memberships.table';

/**
 * A team member's in-portal notification (the bell in the portal's top bar): an alert that
 * was routed to them, or an export that is ready. The worker writes them; the member reads
 * and marks them read. Only their own rows are shown to them, by the API.
 */
export const staffNotifications = pgTable(
  'staff_notifications',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    membershipId: uuid('membership_id').notNull(),
    /** alert or export_ready. */
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    /** The portal page it opens, e.g. /alerts/<id>. */
    link: text('link'),
    alertId: uuid('alert_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'staff_notifications_membership_fk',
      columns: [table.tenantId, table.membershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }),
    index('staff_notifications_member_idx').on(
      table.tenantId,
      table.membershipId,
      table.createdAt.desc(),
    ),
    pgPolicy('staff_notifications_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
