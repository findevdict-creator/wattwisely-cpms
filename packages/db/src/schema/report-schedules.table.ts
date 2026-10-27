import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { reportFrequency, reportKind } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A report sent by e-mail on a schedule (the advanced_reports module): the usage report for
 * last week or last month, per site or per charger, to a list of addresses. The worker
 * makes an export of it when it is due and moves next_run_at on.
 */
export const reportSchedules = pgTable(
  'report_schedules',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    kind: reportKind('kind').notNull().default('usage'),
    frequency: reportFrequency('frequency').notNull(),
    /** site or charger: one row per site, or per charger. */
    groupBy: text('group_by').notNull().default('site'),
    /** Empty for every site. */
    siteId: uuid('site_id'),
    recipients: jsonb('recipients')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** The IANA time zone weeks and months are counted in. */
    timeZone: text('time_zone').notNull().default('UTC'),
    isActive: boolean('is_active').notNull().default(true),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'report_schedules_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    index('report_schedules_due_idx').on(table.tenantId, table.isActive, table.nextRunAt),
    pgPolicy('report_schedules_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
