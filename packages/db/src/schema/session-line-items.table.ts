import {
  bigint,
  foreignKey,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargingSessions } from './charging-sessions.table';
import { sessionLineKind } from './enums';
import { RowLevelSecurity } from './row-level-security';

/**
 * The receipt lines of a priced session, in order. Written when the session is priced;
 * pricing it again replaces them. Amounts are integer minor units of the session's currency.
 */
export const sessionLineItems = pgTable(
  'session_line_items',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    position: integer('position').notNull(),
    kind: sessionLineKind('kind').notNull(),
    /** The tariff band the line is priced in, e.g. "Peak"; null for fees and adjustments. */
    bandName: text('band_name'),
    fromAt: timestamp('from_at', { withTimezone: true }),
    toAt: timestamp('to_at', { withTimezone: true }),
    /** Wh for energy, minutes for time and idle, 1 for a fee or an adjustment. */
    quantity: numeric('quantity', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    /** wh, min or session. */
    unit: text('unit').notNull(),
    /** Ten-thousandths of the major unit per kWh, hour or minute; null for fees and adjustments. */
    unitPrice: integer('unit_price'),
    net: bigint('net', { mode: 'number' }).notNull(),
    tax: bigint('tax', { mode: 'number' }).notNull(),
    gross: bigint('gross', { mode: 'number' }).notNull(),
  },
  (table) => [
    foreignKey({
      name: 'session_line_items_session_fk',
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [chargingSessions.tenantId, chargingSessions.id],
    }),
    unique('session_line_items_position_unique').on(table.sessionId, table.position),
    pgPolicy('session_line_items_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
