import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { RowLevelSecurity } from './row-level-security';
import { tariffs } from './tariffs.table';
import { userAccounts } from './user-accounts.table';

/** Day keys in ISO order, Monday first (the same words opening hours use). */
export type TariffWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * One price band, stored in the shape the pricing engine reads. Prices are integer
 * ten-thousandths of the currency's major unit (0.3450 per kWh is 3450).
 */
export interface StoredTariffBand {
  name: string;
  days: TariffWeekday[];
  /** Local time "HH:MM"; an end before the start wraps past midnight. "24:00" is midnight. */
  start: string;
  end: string;
  energyPricePerKwh: number;
  timePricePerHour: number;
  idleFeePerMinute: number;
}

/**
 * One version of a tariff's prices. Versions are never changed: editing a tariff adds a
 * version, and sessions point at the version they were priced with, so a receipt can
 * always be reproduced. Amounts are integer minor units; the tax rate is in
 * ten-thousandths (2000 is 20%).
 */
export const tariffVersions = pgTable(
  'tariff_versions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    tariffId: uuid('tariff_id').notNull(),
    /** 1 for the first version, then 2, 3 and so on; the highest is in force. */
    number: integer('number').notNull(),
    taxRate: integer('tax_rate').notNull(),
    isTaxIncluded: boolean('is_tax_included').notNull().default(true),
    startFee: bigint('start_fee', { mode: 'number' }).notNull().default(0),
    idleGraceMinutes: integer('idle_grace_minutes').notNull().default(0),
    idleFeeCap: bigint('idle_fee_cap', { mode: 'number' }),
    minimumPrice: bigint('minimum_price', { mode: 'number' }),
    maximumPrice: bigint('maximum_price', { mode: 'number' }),
    /** A session that delivered no energy costs nothing (the design's default). */
    isFreeWithoutEnergy: boolean('is_free_without_energy').notNull().default(true),
    bands: jsonb('bands').$type<StoredTariffBand[]>().notNull(),
    /** Why the prices changed, shown in the version history. */
    note: text('note').notNull().default(''),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'tariff_versions_tariff_fk',
      columns: [table.tenantId, table.tariffId],
      foreignColumns: [tariffs.tenantId, tariffs.id],
    }),
    unique('tariff_versions_tenant_id_unique').on(table.tenantId, table.id),
    unique('tariff_versions_number_unique').on(table.tariffId, table.number),
    check('tariff_versions_tax_rate_range', sql`${table.taxRate} between 0 and 10000`),
    check(
      'tariff_versions_amounts_positive',
      sql`${table.startFee} >= 0 and ${table.idleGraceMinutes} >= 0 and coalesce(${table.idleFeeCap}, 0) >= 0 and coalesce(${table.minimumPrice}, 0) >= 0 and coalesce(${table.maximumPrice}, 0) >= 0`,
    ),
    pgPolicy('tariff_versions_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
