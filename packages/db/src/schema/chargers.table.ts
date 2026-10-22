import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { chargerAuthMode, chargerRegistrationStatus, ocppVersion, siteVisibility } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { sites } from './sites.table';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/** What a no-password charger said about itself at its first accepted boot (story OCP-01). */
export interface BootFingerprint {
  vendor: string;
  model: string;
  serial: string | null;
}

/**
 * One charge point, known to the outside world by its OCPP identity (story AST-02).
 *
 * The portal fills the first group of columns when someone registers the charger.
 * The OCPP gateway (module 4) fills the "reported by the charger" group from
 * BootNotification and Heartbeat, and keeps connector status in `connectors`.
 */
export const chargers = pgTable(
  'chargers',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    siteId: uuid('site_id').notNull(),
    /** The charge point identity in the connection URL, e.g. WW-7KQ4M2XR9T. Unique on the platform. */
    ocppIdentity: text('ocpp_identity').notNull(),
    vendor: text('vendor'),
    model: text('model'),
    authMode: chargerAuthMode('auth_mode').notNull(),
    /** scrypt hash of the charger's password; empty when auth_mode is none. */
    passwordHash: text('password_hash'),
    /** Only for chargers that cannot do TLS: accept ws:// instead of wss://. */
    allowPlainWs: boolean('allow_plain_ws').notNull().default(false),
    /** Empty: the charger follows its site's visibility. */
    visibilityOverride: siteVisibility('visibility_override'),
    // Reported by the charger (written by the OCPP gateway).
    ocppVersion: ocppVersion('ocpp_version'),
    chargePointSerial: text('charge_point_serial'),
    chargeBoxSerial: text('charge_box_serial'),
    firmwareVersion: text('firmware_version'),
    iccid: text('iccid'),
    imsi: text('imsi'),
    meterType: text('meter_type'),
    meterSerial: text('meter_serial'),
    bootFingerprint: jsonb('boot_fingerprint').$type<BootFingerprint>(),
    registrationStatus: chargerRegistrationStatus('registration_status'),
    heartbeatIntervalS: integer('heartbeat_interval_s'),
    lastBootAt: timestamp('last_boot_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    /** The last message of any kind. A charger silent for 2.5 heartbeat intervals counts as offline. */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    updatedBy: uuid('updated_by').references(() => userAccounts.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('chargers_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'chargers_site_fk',
      columns: [table.tenantId, table.siteId],
      foreignColumns: [sites.tenantId, sites.id],
    }),
    // One identity on the whole platform (any letter case), among chargers that are not removed.
    uniqueIndex('chargers_identity_unique')
      .on(sql`lower(${table.ocppIdentity})`)
      .where(sql`${table.deletedAt} is null`),
    index('chargers_site_idx').on(table.tenantId, table.siteId),
    check(
      'chargers_password_matches_mode',
      sql`(${table.authMode} = 'password') = (${table.passwordHash} is not null)`,
    ),
    pgPolicy('chargers_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    // A connecting charger names only its identity; the gateway may read that one charger
    // to learn its tenant, then switches to the tenant for everything else.
    pgPolicy('chargers_identity_lookup', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`lower(${table.ocppIdentity}) = lower(${RowLevelSecurity.currentChargerIdentity()})`,
    }),
  ],
);
