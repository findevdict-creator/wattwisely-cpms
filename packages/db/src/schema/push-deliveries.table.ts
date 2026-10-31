import { foreignKey, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { chargingSessions } from './charging-sessions.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * A push the worker sent about a session (module 34): started, nearly full, the idle fee
 * warning, the receipt. One row per session and kind keeps each push once-only, as the
 * notifications outbox does for e-mails; how many phones took it is kept for the logs.
 */
export const pushDeliveries = pgTable(
  'push_deliveries',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    kind: text('kind').notNull(),
    driverAccountId: uuid('driver_account_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    /** Why no phone took it, when none did. */
    lastError: text('last_error'),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('push_deliveries_session_kind_unique').on(table.tenantId, table.sessionId, table.kind),
    foreignKey({
      name: 'push_deliveries_session_fk',
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [chargingSessions.tenantId, chargingSessions.id],
    }),
    pgPolicy('push_deliveries_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
