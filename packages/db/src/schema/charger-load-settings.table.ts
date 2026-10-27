import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * What load management knows about one charger beyond its connectors (module 17): its
 * priority when the site's cap is shared by priority (10 first, 1 last, 5 by default), and
 * an optional ceiling of its own, for a charger whose supply is thinner than its plugs say.
 * A charger without a row has the defaults.
 */
export const chargerLoadSettings = pgTable(
  'charger_load_settings',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    priority: integer('priority').notNull().default(5),
    /** The most this charger may ever be given; empty means what its connectors can take. */
    maxPowerKw: numeric('max_power_kw', { precision: 7, scale: 1, mode: 'number' }),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('charger_load_settings_charger_unique').on(table.tenantId, table.chargerId),
    foreignKey({
      name: 'charger_load_settings_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    check('charger_load_settings_priority_range', sql`${table.priority} between 1 and 10`),
    pgPolicy('charger_load_settings_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
