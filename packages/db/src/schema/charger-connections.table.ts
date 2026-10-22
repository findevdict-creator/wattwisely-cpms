import {
  boolean,
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargers } from './chargers.table';
import { ocppVersion } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { Timestamps } from './timestamps';

/**
 * Which gateway instance holds the open socket of each charger (OCPP gateway design,
 * "routing table"). The row is a lease: the instance renews `lease_expires_at` while
 * the socket lives and deletes the row when it closes, so a charger is online exactly
 * when it has a live lease. A crashed instance's leases simply run out.
 */
export const chargerConnections = pgTable(
  'charger_connections',
  {
    chargerId: uuid('charger_id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    /** Host and process of the gateway holding the socket, e.g. "gateway-1:42". */
    instanceId: text('instance_id').notNull(),
    /** Random per socket, so a stale row is never mistaken for a new connection. */
    connectionId: text('connection_id').notNull(),
    ocppVersion: ocppVersion('ocpp_version').notNull(),
    remoteIp: text('remote_ip'),
    /** True once the charger's BootNotification was accepted on this socket. */
    isBooted: boolean('is_booted').notNull().default(false),
    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'charger_connections_charger_fk',
      columns: [table.tenantId, table.chargerId],
      foreignColumns: [chargers.tenantId, chargers.id],
    }),
    index('charger_connections_lease_idx').on(table.tenantId, table.leaseExpiresAt),
    pgPolicy('charger_connections_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
  ],
);
