import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { drivers } from './drivers.table';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * An operator's invitation to a driver to link a login to their drivers row (module 19,
 * story DRV-04). The e-mail carries a link whose secret is stored only as a hash. One
 * invitation is open per driver at a time: resending renews the hash and the end date,
 * cancelling or accepting closes it. Rows are kept, so the driver's page shows what was sent.
 */
export const driverInvitations = pgTable(
  'driver_invitations',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    driverId: uuid('driver_id').notNull(),
    /** The address the e-mail went to. The login that accepts must carry the same verified address. */
    email: text('email').notNull(),
    /** SHA-256 of the secret in the link. Null once the invitation is closed. */
    tokenHash: text('token_hash').unique(),
    invitedBy: uuid('invited_by').references(() => userAccounts.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    foreignKey({
      name: 'driver_invitations_driver_fk',
      columns: [table.tenantId, table.driverId],
      foreignColumns: [drivers.tenantId, drivers.id],
    }),
    index('driver_invitations_driver_idx').on(table.tenantId, table.driverId),
    pgPolicy('driver_invitations_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    // Whoever holds the link may read that one invitation, before any tenant is chosen.
    pgPolicy('driver_invitations_holder', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.tokenHash} = ${RowLevelSecurity.currentInviteTokenHash()}`,
    }),
  ],
);
