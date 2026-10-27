import {
  boolean,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * The power cap load management last gave one charger (module 17), and whether the charger
 * has it: the worker writes the cap and queues a SetChargingProfile command, then reads the
 * command's outcome back here. One row per charger under a policy; the row goes when the
 * policy is switched off and the cap has been cleared.
 */
export const chargerLoadAllocations = pgTable(
  'charger_load_allocations',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    siteId: uuid('site_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    /** The cap in watts, as the charging profile says it. */
    limitW: integer('limit_w').notNull(),
    /** Why this much: share, minimum, idle, squeezed (the cap cannot cover every minimum), none. */
    reason: text('reason').notNull(),
    /** True while a connector of the charger has a car on it. */
    isCharging: boolean('is_charging').notNull().default(false),
    /** The last SetChargingProfile (or ClearChargingProfile) queued for this cap. */
    commandId: uuid('command_id'),
    /** True once the charger accepted the cap. */
    isApplied: boolean('is_applied').notNull().default(false),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    /** The charger's last answer when it did not accept the cap. */
    lastError: text('last_error'),
    attempts: integer('attempts').notNull().default(0),
    /** When the worker may send the cap again after a failure. */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('charger_load_allocations_charger_unique').on(table.tenantId, table.chargerId),
    foreignKey({
      name: 'charger_load_allocations_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    index('charger_load_allocations_site_idx').on(table.tenantId, table.siteId),
    pgPolicy('charger_load_allocations_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
