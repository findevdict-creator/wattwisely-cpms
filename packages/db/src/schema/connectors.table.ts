import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { connectorStatus, connectorType, currentType } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A plug on a charger (story AST-03). Staff add connectors by hand before the charger
 * connects, or the OCPP gateway creates them from the first StatusNotification.
 * Sessions (module 5) point at (tenant_id, id), so a session never uses another tenant's plug.
 */
export const connectors = pgTable(
  'connectors',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    chargerId: uuid('charger_id').notNull(),
    /** The connectorId the charger uses in OCPP 1.6 messages: 1, 2, 3… (0 means the whole charger). */
    ocppConnectorId: integer('ocpp_connector_id').notNull(),
    /** OCPP 2.0.1 EVSE id (M2). On 1.6 it stays empty. */
    evseId: integer('evse_id'),
    type: connectorType('type').notNull().default('unknown'),
    currentType: currentType('current_type'),
    maxPowerKw: numeric('max_power_kw', { precision: 7, scale: 1, mode: 'number' }),
    /** What drivers see, e.g. "A" or "Left". */
    label: text('label').notNull(),
    // Reported by the charger (written by the OCPP gateway from StatusNotification).
    status: connectorStatus('status').notNull().default('unknown'),
    errorCode: text('error_code'),
    vendorErrorCode: text('vendor_error_code'),
    statusInfo: text('status_info'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('connectors_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'connectors_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    unique('connectors_ocpp_id_unique').on(table.chargerId, table.ocppConnectorId),
    unique('connectors_label_unique').on(table.chargerId, table.label),
    index('connectors_charger_idx').on(table.tenantId, table.chargerId),
    check('connectors_ocpp_id_positive', sql`${table.ocppConnectorId} >= 1`),
    pgPolicy('connectors_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
