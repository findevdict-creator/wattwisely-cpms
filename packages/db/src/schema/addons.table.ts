import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgPolicy, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { addonPricingUnit } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * The price of each add-on module (Architecture, "Paid add-on modules"). The module itself,
 * its name and its permissions are declared in code (the API's ModuleCatalog); this row says
 * what it costs and whether it can be sold right now. Global table, written by the admin console.
 */
export const addons = pgTable(
  'addons',
  {
    id: uuid('id').primaryKey(),
    /** The module key, e.g. "load_management". */
    key: text('key').notNull().unique(),
    currency: text('currency').notNull().default('USD'),
    /** Per month, in minor units, per `pricing_unit`. */
    price: integer('price').notNull().default(0),
    pricingUnit: addonPricingUnit('pricing_unit').notNull().default('per_tenant'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    check('addons_currency_code', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('addons_price_positive', sql`${table.price} >= 0`),
    pgPolicy('addons_visible', { for: 'select', to: RowLevelSecurity.APP_ROLE, using: sql`true` }),
    pgPolicy('addons_platform_insert', {
      for: 'insert',
      to: RowLevelSecurity.APP_ROLE,
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
    pgPolicy('addons_platform_update', {
      for: 'update',
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isPlatformAccess(),
      withCheck: RowLevelSecurity.isPlatformAccess(),
    }),
  ],
);
