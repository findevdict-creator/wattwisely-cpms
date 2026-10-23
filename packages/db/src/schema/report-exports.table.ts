import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { bytea } from './bytea';
import { reportExportStatus, reportKind } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A CSV file built in the background (story SES-04 and the reports): the API stores what
 * was asked for, with the caller's site scope already applied; the worker builds the file,
 * keeps it gzipped in object storage (or in this row without one) for seven days and tells the person who asked. A scheduled report
 * is an export too, with the schedule's recipients instead of a person.
 */
export const reportExports = pgTable(
  'report_exports',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    kind: reportKind('kind').notNull(),
    /** The filters, period and site scope, in the shape packages/reports reads. */
    parameters: jsonb('parameters')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: reportExportStatus('status').notNull().default('queued'),
    requestedBy: uuid('requested_by').references(() => userAccounts.id),
    /** The member who asked, for the in-portal notification; empty for a scheduled report. */
    membershipId: uuid('membership_id'),
    scheduleId: uuid('schedule_id'),
    fileName: text('file_name').notNull(),
    rowCount: integer('row_count'),
    sizeBytes: integer('size_bytes'),
    /** The CSV, gzipped, when there is no object storage; emptied when the export expires. */
    data: bytea('data'),
    /**
     * Where the gzipped CSV is in object storage (module 12), e.g.
     * exports/<tenant id>/<export id>.csv.gz; data stays empty then. Removed on expiry.
     */
    storageKey: text('storage_key'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    index('report_exports_status_idx').on(table.tenantId, table.status, table.createdAt),
    index('report_exports_requester_idx').on(table.tenantId, table.requestedBy, table.createdAt),
    pgPolicy('report_exports_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
