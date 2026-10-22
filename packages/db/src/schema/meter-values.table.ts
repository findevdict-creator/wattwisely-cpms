import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { chargingSessions } from './charging-sessions.table';
import { RowLevelSecurity } from './row-level-security';

/** One sampledValue from an OCPP 1.6 MeterValues message, as the charger sent it. */
export interface SampledValue {
  value: string;
  measurand?: string;
  unit?: string;
  phase?: string;
  context?: string;
  location?: string;
  format?: string;
}

/**
 * Meter readings during a session. The pricing engine (module 5) reads the cumulative
 * energy; the other measurands are kept for charts. Readings outside any session are
 * only in the raw message log.
 */
export const meterValues = pgTable(
  'meter_values',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    /** The charger's own timestamp, so late readings still sort right. */
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    /** Energy.Active.Import.Register in Wh, when the sample carried it. */
    energyWh: bigint('energy_wh', { mode: 'number' }),
    /** Power.Active.Import in W, when the sample carried it. */
    powerW: integer('power_w'),
    socPercent: smallint('soc_percent'),
    /** Every sampledValue of the reading, untouched. */
    samples: jsonb('samples').$type<SampledValue[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'meter_values_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    foreignKey({
      name: 'meter_values_session_fk',
      columns: [table.sessionId],
      foreignColumns: [chargingSessions.id],
    }),
    // A resent MeterValues (after an outage) is stored once.
    uniqueIndex('meter_values_session_time_unique').on(table.sessionId, table.measuredAt),
    index('meter_values_charger_idx').on(table.tenantId, table.chargerId, table.measuredAt),
    pgPolicy('meter_values_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
