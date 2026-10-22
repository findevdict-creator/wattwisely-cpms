import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargingSessions } from './charging-sessions.table';
import { chargingSessionStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';

/**
 * Every state a session went through and why, append-only. The pricing input is built
 * from it (charging and idle periods), and the portal shows it as the session timeline.
 */
export const sessionStateChanges = pgTable(
  'session_state_changes',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    /** Null for the first row, when the session is created. */
    fromStatus: chargingSessionStatus('from_status'),
    toStatus: chargingSessionStatus('to_status').notNull(),
    /** What happened, e.g. transaction_started, energy_stopped, unplugged, priced. */
    event: text('event').notNull(),
    /** When it happened: the charger's timestamp when it sent one, otherwise the platform's clock. */
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'session_state_changes_session_fk',
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [chargingSessions.tenantId, chargingSessions.id],
    }),
    index('session_state_changes_session_idx').on(table.sessionId, table.occurredAt),
    pgPolicy('session_state_changes_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
