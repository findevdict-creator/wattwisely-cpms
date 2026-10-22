import {
  bigint,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgSequence,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { connectors } from './connectors.table';
import { chargingSessionStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * OCPP 1.6 expects the platform to hand out an integer transactionId at StartTransaction.
 * One sequence for the whole platform keeps every id unique (many chargers store it as a
 * 32-bit integer, hence the ceiling).
 */
export const ocppTransactionIdSeq = pgSequence('ocpp_transaction_id_seq', {
  startWith: 1000,
  increment: 1,
  minValue: 1,
  maxValue: 2147483647,
});

/**
 * One charge, from StartTransaction to StopTransaction, as the gateway records it.
 * Module 5 (sessions and pricing) adds the driver, the tariff and the money; this
 * table already holds everything the charger reports so those can be computed later.
 */
export const chargingSessions = pgTable(
  'charging_sessions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    connectorId: uuid('connector_id').notNull(),
    /** The transactionId the charger and the platform both use for this session. */
    ocppTransactionId: integer('ocpp_transaction_id').notNull(),
    /** The idTag that started it: an RFID card or a token the platform issued for a remote start. */
    idTag: text('id_tag').notNull(),
    status: chargingSessionStatus('status').notNull().default('charging'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** The meter readings in Wh at the start and the end. */
    meterStartWh: bigint('meter_start_wh', { mode: 'number' }).notNull(),
    meterStopWh: bigint('meter_stop_wh', { mode: 'number' }),
    /** Energy delivered so far: the latest reading minus the start, kept current by MeterValues. */
    energyWh: bigint('energy_wh', { mode: 'number' }).notNull().default(0),
    /** OCPP 1.6 reason, e.g. Remote, EVDisconnected, DeAuthorized. */
    stopReason: text('stop_reason'),
    /** The id of the remote start command that began it, when there was one. */
    commandId: uuid('command_id'),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'charging_sessions_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    foreignKey({
      name: 'charging_sessions_connector_fk',
      columns: [table.tenantId, table.connectorId],
      foreignColumns: [connectors.tenantId, connectors.id],
    }),
    // A replayed StartTransaction (charger offline, then resends) must not make a second session.
    unique('charging_sessions_transaction_unique').on(
      table.tenantId,
      table.chargerId,
      table.ocppTransactionId,
    ),
    index('charging_sessions_connector_idx').on(table.tenantId, table.connectorId, table.status),
    index('charging_sessions_started_idx').on(table.tenantId, table.startedAt),
    pgPolicy('charging_sessions_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
