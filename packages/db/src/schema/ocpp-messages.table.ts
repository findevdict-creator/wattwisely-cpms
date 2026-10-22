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
import { ocppDirection, ocppMessageType } from './enums';
import { RowLevelSecurity } from './row-level-security';

/**
 * The raw OCPP message log: every frame in and out, as the gateway saw it. The portal
 * shows it on the charger page; support reads it when a charger misbehaves.
 * Retention (90 days, partitions) is a later operations task.
 */
export const ocppMessages = pgTable(
  'ocpp_messages',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    direction: ocppDirection('direction').notNull(),
    messageType: ocppMessageType('message_type').notNull(),
    /** The OCPP-J unique id, so a CALL and its CALLRESULT can be paired. */
    messageId: text('message_id').notNull(),
    /** The action of the CALL, also on its result or error. */
    action: text('action').notNull(),
    payload: jsonb('payload').notNull(),
    /** On a CALLERROR: the OCPP error code, e.g. FormationViolation. */
    errorCode: text('error_code'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'ocpp_messages_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    index('ocpp_messages_charger_idx').on(table.tenantId, table.chargerId, table.receivedAt),
    pgPolicy('ocpp_messages_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
