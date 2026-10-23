import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { alertStatus, alertType } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A charger alert (story NTF-04). The worker opens one when it sees a condition, keeps it up
 * to date while the condition lasts and closes it when the condition clears; staff can
 * acknowledge it with a note meanwhile. One condition has at most one live alert: the
 * subject key names what it is about (the charger, the connector or the session), so a
 * repeat updates the alert instead of raising another.
 */
export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    type: alertType('type').notNull(),
    status: alertStatus('status').notNull().default('open'),
    /** The charger, connector or session id the condition is about, e.g. a connector id for a fault. */
    subjectKey: text('subject_key').notNull(),
    siteId: uuid('site_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    connectorId: uuid('connector_id'),
    sessionId: uuid('session_id'),
    /** Words for people, e.g. "WW-7KQ4M2XR9T is offline". */
    title: text('title').notNull(),
    /** What the worker saw, e.g. the error code or how many starts failed. */
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** When the condition began (the charger's last message, the fault report), often before the alert opened. */
    beganAt: timestamp('began_at', { withTimezone: true }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    /** The last scan that still saw the condition. */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    /** How often the condition came back while the alert was live or just closed. */
    occurrences: integer('occurrences').notNull().default(1),
    acknowledgedBy: uuid('acknowledged_by').references(() => userAccounts.id),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgeNote: text('acknowledge_note').notNull().default(''),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    /** cleared (the condition ended) or charger_removed. */
    closeReason: text('close_reason'),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('alerts_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'alerts_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    uniqueIndex('alerts_live_unique')
      .on(table.tenantId, table.type, table.subjectKey)
      .where(sql`${table.status} <> 'closed'`),
    index('alerts_status_idx').on(table.tenantId, table.status, table.openedAt),
    index('alerts_charger_idx').on(table.tenantId, table.chargerId, table.beganAt),
    pgPolicy('alerts_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
