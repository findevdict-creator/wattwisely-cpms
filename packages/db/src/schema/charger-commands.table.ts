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
import { chargers } from './chargers.table';
import { chargerCommandAction, chargerCommandStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A command the platform sent (or is about to send) to a charger: remote start or stop,
 * reset, unlock, change availability. The API writes the row and the audit entry; the
 * gateway sends it and writes the charger's answer (OCPP gateway design, "Commands").
 */
export const chargerCommands = pgTable(
  'charger_commands',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    action: chargerCommandAction('action').notNull(),
    /** What the command needs, in the platform's words: ocpp_connector_id, id_tag, type… */
    payload: jsonb('payload')
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: chargerCommandStatus('status').notNull().default('queued'),
    /** While the charger is offline the command waits until here, then expires. */
    queuedUntil: timestamp('queued_until', { withTimezone: true }).notNull(),
    requestedBy: uuid('requested_by').references(() => userAccounts.id),
    requestedByLabel: text('requested_by_label').notNull(),
    /** The charger's reply, e.g. {"status": "Accepted"}. */
    result: jsonb('result'),
    /** Why the command did not succeed, in a few words. */
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'charger_commands_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    index('charger_commands_charger_idx').on(table.tenantId, table.chargerId, table.createdAt),
    index('charger_commands_queued_idx')
      .on(table.chargerId, table.createdAt)
      .where(sql`${table.status} = 'queued'`),
    pgPolicy('charger_commands_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
