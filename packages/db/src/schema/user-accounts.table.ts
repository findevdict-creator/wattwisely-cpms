import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { Timestamps } from './timestamps';

/**
 * A staff member's identity, one row per person across all tenants. Global table, no RLS.
 * Created when someone is invited (keycloak_id still empty) or logs in for the first time.
 * Keycloak keeps the password and two-factor secrets; this table only links to it.
 */
export const userAccounts = pgTable(
  'user_accounts',
  {
    id: uuid('id').primaryKey(),
    /** The Keycloak user id (the token's "sub"). Empty until the person first logs in. */
    keycloakId: text('keycloak_id').unique(),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    isPlatformStaff: boolean('is_platform_staff').notNull().default(false),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [uniqueIndex('user_accounts_email_unique').on(sql`lower(${table.email})`)],
);
