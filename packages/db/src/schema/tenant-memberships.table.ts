import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { membershipStatus } from './enums';
import { RowLevelSecurity } from './row-level-security';
import { tenants } from './tenants.table';
import { Timestamps } from './timestamps';
import { userAccounts } from './user-accounts.table';

/**
 * A person's place in one tenant. An invitation is a membership with status "invited";
 * removing someone sets status "removed", so the audit log can still name them.
 */
export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userAccountId: uuid('user_account_id')
      .notNull()
      .references(() => userAccounts.id),
    status: membershipStatus('status').notNull(),
    invitedBy: uuid('invited_by').references(() => userAccounts.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    /** SHA-256 of the secret in the invitation link. The link itself is never stored. */
    inviteTokenHash: text('invite_token_hash').unique(),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedBy: uuid('removed_by').references(() => userAccounts.id),
    version: integer('version').notNull().default(1),
    ...Timestamps.columns(),
  },
  (table) => [
    unique('tenant_memberships_person_unique').on(table.tenantId, table.userAccountId),
    // Lets membership_roles point at (tenant_id, id), so a role can never cross tenants.
    unique('tenant_memberships_tenant_id_unique').on(table.tenantId, table.id),
    index('tenant_memberships_status_idx').on(table.tenantId, table.status),
    index('tenant_memberships_user_idx').on(table.userAccountId),
    pgPolicy('tenant_memberships_tenant_isolation', {
      to: RowLevelSecurity.APP_ROLE,
      using: RowLevelSecurity.isCurrentTenant(table.tenantId),
      withCheck: RowLevelSecurity.isCurrentTenant(table.tenantId),
    }),
    // Before a tenant is chosen, a person may list their own memberships (tenant switcher).
    pgPolicy('tenant_memberships_own_rows', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.userAccountId} = ${RowLevelSecurity.currentUserAccount()}`,
    }),
    // Whoever holds an invitation link may read that one invitation.
    pgPolicy('tenant_memberships_invitation_holder', {
      for: 'select',
      to: RowLevelSecurity.APP_ROLE,
      using: sql`${table.inviteTokenHash} = ${RowLevelSecurity.currentInviteTokenHash()}`,
    }),
  ],
);
