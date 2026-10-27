import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { drivers } from './drivers.table';
import { driverPaymentMode, rfidCardStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * An RFID card a driver holds (module 13). `id_tag` is what the charger sends in
 * Authorize and StartTransaction (OCPP 1.6 allows 20 characters). The gateway looks the
 * card up by tag inside the charger's tenant; the same tag may exist in two tenants, never
 * twice in one. Cards are never deleted, so sessions keep pointing at the card that
 * started them: a card that is gone is marked lost or blocked.
 */
export const rfidCards = pgTable(
  'rfid_cards',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    driverId: uuid('driver_id').notNull(),
    idTag: text('id_tag').notNull(),
    /** What the driver calls it, e.g. "Blue card" or the number printed on it. */
    label: text('label').notNull().default(''),
    status: rfidCardStatus('status').notNull().default('active'),
    /** Whether a session this card starts is paid (module 19): inherit asks the driver, then their groups. */
    paymentMode: driverPaymentMode('payment_mode').notNull().default('inherit'),
    /** After this moment the charger answers Expired; empty means no end date. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** The last time a charger accepted the card. */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('rfid_cards_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'rfid_cards_driver_fk',
      columns: [table.tenantId, table.driverId],
      foreignColumns: [drivers.tenantId, drivers.id],
    }),
    // The gateway's lookup: one card per tag in a tenant, whatever the letter case.
    uniqueIndex('rfid_cards_tag_unique').on(table.tenantId, sql`lower(${table.idTag})`),
    index('rfid_cards_driver_idx').on(table.tenantId, table.driverId),
    pgPolicy('rfid_cards_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
