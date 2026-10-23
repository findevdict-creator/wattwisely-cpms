import {
  boolean,
  foreignKey,
  integer,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargingSessions } from './charging-sessions.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * A driver's wish to hear about one charge by e-mail (story NTF-01), given on the charge page
 * with the charge key in hand. The receipt and "session ended" always go; the other events
 * can be switched off. When the address bounces for good it is marked undeliverable and the
 * charge page asks the driver to correct it.
 */
export const sessionSubscriptions = pgTable(
  'session_subscriptions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    email: text('email').notNull(),
    wantsStarted: boolean('wants_started').notNull().default(true),
    wantsNearlyFull: boolean('wants_nearly_full').notNull().default(true),
    wantsFinished: boolean('wants_finished').notNull().default(true),
    wantsIdleWarning: boolean('wants_idle_warning').notNull().default(true),
    isUndeliverable: boolean('is_undeliverable').notNull().default(false),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('session_subscriptions_session_unique').on(table.tenantId, table.sessionId),
    foreignKey({
      name: 'session_subscriptions_session_fk',
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [chargingSessions.tenantId, chargingSessions.id],
    }),
    pgPolicy('session_subscriptions_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
