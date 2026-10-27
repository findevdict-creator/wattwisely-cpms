import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgSequence,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { ChargingSessionReferences } from './charging-session-references';
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
 * One charging session, from the start of the transaction until it is priced
 * (Sessions and Pricing design). The gateway writes what the charger reports; the
 * worker moves the state on, prices the session and stores the totals. The site, its
 * time zone and the tariff version are copied in at the start, so later edits to the
 * site or the tariff never change a session's price. A paid session (module 6) exists
 * from the card hold on: it is authorising, then starting, before the charger starts it,
 * so the OCPP transaction id and the start reading arrive later.
 */
export const chargingSessions = pgTable(
  'charging_sessions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    siteId: uuid('site_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    connectorId: uuid('connector_id').notNull(),
    /** The transactionId the charger and the platform both use for this session; empty until the charger starts it. */
    ocppTransactionId: integer('ocpp_transaction_id'),
    /** The idTag that started it: an RFID card or a token the platform issued for a remote start. */
    idTag: text('id_tag').notNull(),
    /** The driver and the card behind the idTag, when the tag was a registered card (module 13). */
    driverId: uuid('driver_id'),
    rfidCardId: uuid('rfid_card_id'),
    status: chargingSessionStatus('status').notNull().default('charging'),
    /** The site's IANA time zone when the session started; band times are read in it. */
    timeZone: text('time_zone').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    /** When the charge ended (StopTransaction). The idle fee can still run until unplugged. */
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** When the connector became available again after the charge: the car left. */
    unpluggedAt: timestamp('unplugged_at', { withTimezone: true }),
    /** When the session reached completed, not_started or failed. */
    closedAt: timestamp('closed_at', { withTimezone: true }),
    /** The meter readings in Wh at the start and the end; the start is empty until the charger starts. */
    meterStartWh: bigint('meter_start_wh', { mode: 'number' }),
    meterStopWh: bigint('meter_stop_wh', { mode: 'number' }),
    /** Energy delivered so far: the latest reading minus the start, kept current by MeterValues. */
    energyWh: bigint('energy_wh', { mode: 'number' }).notNull().default(0),
    /** The last time the energy reading went up; the worker marks the session idle after a pause. */
    energyIncreasedAt: timestamp('energy_increased_at', { withTimezone: true }),
    /** The last time the charger said anything about this session; silent for 24 hours is stale. */
    lastEventAt: timestamp('last_event_at', { withTimezone: true }).notNull().defaultNow(),
    /** OCPP 1.6 reason, e.g. Remote, EVDisconnected, DeAuthorized. */
    stopReason: text('stop_reason'),
    /** Why a session failed: no_valid_stop_data, stale or closed_by_staff. */
    failureReason: text('failure_reason'),
    /** The id of the remote start command that began it, when there was one. */
    commandId: uuid('command_id'),
    /** True when a card hold was taken before the start (module 6): the payment row is found by session_id. */
    isPaid: boolean('is_paid').notNull().default(false),
    /** The tariff version in force when it started; null when the site had no tariff. */
    tariffVersionId: uuid('tariff_version_id'),
    currency: text('currency'),
    /** Totals in minor units: the running cost while charging, the final price once completed. */
    netAmount: bigint('net_amount', { mode: 'number' }),
    taxAmount: bigint('tax_amount', { mode: 'number' }),
    grossAmount: bigint('gross_amount', { mode: 'number' }),
    pricedAt: timestamp('priced_at', { withTimezone: true }),
    pricingEngineVersion: text('pricing_engine_version'),
    /** A hash of everything the engine read, so a re-run can show it saw the same input. */
    pricingInputHash: text('pricing_input_hash'),
    /** Why someone should check the session before it is captured, e.g. long_session. */
    reviewFlags: jsonb('review_flags').$type<string[]>().notNull().default([]),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('charging_sessions_tenant_id_unique').on(table.tenantId, table.id),
    ...ChargingSessionReferences.of(table),
    // A replayed StartTransaction (charger offline, then resends) must not make a second session.
    unique('charging_sessions_transaction_unique').on(
      table.tenantId,
      table.chargerId,
      table.ocppTransactionId,
    ),
    index('charging_sessions_connector_idx').on(table.tenantId, table.connectorId, table.status),
    index('charging_sessions_started_idx').on(table.tenantId, table.startedAt),
    index('charging_sessions_site_idx').on(table.tenantId, table.siteId, table.startedAt),
    // A driver's charging history, newest first.
    index('charging_sessions_driver_idx').on(table.tenantId, table.driverId, table.startedAt),
    // The worker's jobs look only at sessions that are still open.
    index('charging_sessions_open_idx')
      .on(table.tenantId, table.status, table.lastEventAt)
      .where(sql`${table.closedAt} is null`),
    pgPolicy('charging_sessions_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
