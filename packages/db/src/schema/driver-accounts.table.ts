import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { Timestamps } from './timestamps';

/**
 * A driver's own login (module 19): one row per person across the whole platform, with no
 * tenant of its own. A global table, no RLS. Keycloak keeps the password; this row links the
 * Keycloak user to the drivers rows that operators hold about the person (drivers.driver_account_id).
 * Created on the first request from the driver app, or ahead of it by a seed with the e-mail
 * alone (keycloak_id still empty), and linked at the first login with that verified address.
 */
export const driverAccounts = pgTable(
  'driver_accounts',
  {
    id: uuid('id').primaryKey(),
    /** The Keycloak user id (the token's "sub"). Empty until the person first logs in. */
    keycloakId: text('keycloak_id').unique(),
    email: text('email').notNull(),
    /** What the driver calls themselves in the app; operators keep their own name for the driver. */
    displayName: text('display_name').notNull().default(''),
    phone: text('phone'),
    /** The driver's customer at the payment provider (a Stripe Customer on the platform account), once a card was saved. */
    paymentCustomerId: text('payment_customer_id'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    /** What the driver hears about their charges (module 34, NTF-01), and how. */
    wantsStarted: boolean('wants_started').notNull().default(true),
    wantsNearlyFull: boolean('wants_nearly_full').notNull().default(true),
    wantsFinished: boolean('wants_finished').notNull().default(true),
    wantsIdleWarning: boolean('wants_idle_warning').notNull().default(true),
    isPushEnabled: boolean('is_push_enabled').notNull().default(true),
    isEmailEnabled: boolean('is_email_enabled').notNull().default(false),
    ...Timestamps.columns(),
  },
  (table) => [uniqueIndex('driver_accounts_email_unique').on(sql`lower(${table.email})`)],
);
