import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { notificationStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * The e-mail outbox (module 11). Whatever decides that someone should hear about something
 * (a driver's session, an alert, a ready export, a scheduled report) writes one row here; the
 * worker's sender renders it in the tenant's brand and sends it, retrying on failure. The
 * dedupe key makes each message once-only: the same event fired twice is sent once (NTF-01).
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    /** Which message: session_started, receipt, alert_opened, export_ready, scheduled_report… */
    kind: text('kind').notNull(),
    /** E.g. "session:<id>:receipt" or "alert:<id>:<membership id>". */
    dedupeKey: text('dedupe_key').notNull(),
    toAddress: text('to_address').notNull(),
    /** What the message is about, when it is about one of these. */
    sessionId: uuid('session_id'),
    alertId: uuid('alert_id'),
    exportId: uuid('export_id'),
    membershipId: uuid('membership_id'),
    /** Everything the template needs, so sending reads nothing else but the brand. */
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: notificationStatus('status').notNull().default('pending'),
    /** Not before this time: the end of quiet hours, or the next retry. */
    sendAfter: timestamp('send_after', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('notifications_dedupe_unique').on(table.tenantId, table.dedupeKey),
    index('notifications_pending_idx')
      .on(table.tenantId, table.sendAfter)
      .where(sql`${table.status} = 'pending'`),
    index('notifications_session_idx').on(table.tenantId, table.sessionId),
    pgPolicy('notifications_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
