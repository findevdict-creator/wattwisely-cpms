import { foreignKey, index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { chargerRegistrationStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * Every BootNotification a charger sent, with what it said about itself and the
 * answer it got. Spots firmware changes, hardware swaps and reboot loops.
 */
export const chargerBootEvents = pgTable(
  'charger_boot_events',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    vendor: text('vendor').notNull(),
    model: text('model').notNull(),
    chargePointSerial: text('charge_point_serial'),
    chargeBoxSerial: text('charge_box_serial'),
    firmwareVersion: text('firmware_version'),
    iccid: text('iccid'),
    imsi: text('imsi'),
    meterType: text('meter_type'),
    meterSerial: text('meter_serial'),
    responseStatus: chargerRegistrationStatus('response_status').notNull(),
    /** Why the boot was not accepted, e.g. "fingerprint_mismatch". */
    reason: text('reason'),
    bootedAt: timestamp('booted_at', { withTimezone: true }).notNull().defaultNow(),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'charger_boot_events_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    index('charger_boot_events_charger_idx').on(table.tenantId, table.chargerId, table.bootedAt),
    pgPolicy('charger_boot_events_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
