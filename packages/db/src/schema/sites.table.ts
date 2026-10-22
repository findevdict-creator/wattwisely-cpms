import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { siteVisibility } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tariffs } from './tariffs.table';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A site's postal address, stored as JSON with the API's snake_case keys.
 * `country` is the ISO 3166-1 alpha-2 code, e.g. "GB".
 */
export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  region?: string;
  country: string;
}

/** One opening period in the site's own time zone, e.g. 08:00 to 18:00. "24:00" closes at midnight. */
export interface OpeningPeriod {
  opens: string;
  closes: string;
}

/** Day keys in ISO order, Monday first. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Weekly opening hours. A day that is missing or empty is closed. */
export type OpeningHours = Partial<Record<Weekday, OpeningPeriod[]>>;

/**
 * A charging location: its address, map pin, time zone, opening hours and who may
 * charge there (story AST-01). Sites are soft-deleted, so past sessions and reports
 * keep their name. Chargers point at (tenant_id, id), so a charger can never sit on
 * another tenant's site.
 */
export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    address: jsonb('address').$type<SiteAddress>().notNull(),
    latitude: numeric('latitude', { precision: 9, scale: 6, mode: 'number' }).notNull(),
    longitude: numeric('longitude', { precision: 9, scale: 6, mode: 'number' }).notNull(),
    /** IANA time zone, e.g. "Europe/London". Prices, receipts and opening hours use it. */
    timeZone: text('time_zone').notNull(),
    /** Empty means open around the clock, every day. */
    openingHours: jsonb('opening_hours').$type<OpeningHours>(),
    visibility: siteVisibility('visibility').notNull().default('private'),
    /** The grid connection's limit; load management (an add-on) keeps the site under it. */
    powerLimitKw: numeric('power_limit_kw', { precision: 8, scale: 1, mode: 'number' }),
    parkingNotes: text('parking_notes').notNull().default(''),
    /** The tariff new sessions here are priced with; none means sessions are recorded but not priced. */
    tariffId: uuid('tariff_id'),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    // Lets chargers and role grants point at (tenant_id, id), so they can never cross tenants.
    unique('sites_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'sites_tariff_fk',
      columns: [table.tenantId, table.tariffId],
      foreignColumns: [tariffs.tenantId, tariffs.id],
    }),
    // A name is unique within the tenant among sites that are not deleted.
    uniqueIndex('sites_name_unique')
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
    index('sites_location_idx').on(table.tenantId, table.latitude, table.longitude),
    check('sites_latitude_range', sql`${table.latitude} between -90 and 90`),
    check('sites_longitude_range', sql`${table.longitude} between -180 and 180`),
    pgPolicy('sites_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
