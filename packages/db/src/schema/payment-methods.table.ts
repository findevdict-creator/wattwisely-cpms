import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { driverAccounts } from './driver-accounts.table';
import { paymentMethodStatus } from './enums';
import { Timestamps } from './timestamps';

/**
 * A card a driver saved to their account (module 19). The card itself stays with the payment
 * provider: it is a payment method on the driver's customer at the platform account, and this
 * row keeps the provider's id and what the app shows (brand, last four digits, expiry). Before a
 * charge the method is copied to the operator's connected account for the hold. A global table
 * like driver_accounts, with no row-level security: the API reaches it only through the driver's
 * own account, or through the driver record a card tap names.
 */
export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey(),
    driverAccountId: uuid('driver_account_id')
      .notNull()
      .references(() => driverAccounts.id),
    provider: text('provider').notNull().default('stripe'),
    /** The provider's id for the card on the platform account, e.g. pm_1Abc…. */
    providerPaymentMethodId: text('provider_payment_method_id').notNull(),
    brand: text('brand').notNull(),
    last4: text('last4').notNull(),
    expMonth: integer('exp_month').notNull(),
    expYear: integer('exp_year').notNull(),
    status: paymentMethodStatus('status').notNull().default('active'),
    /** The one card a hold is taken from; the first saved card becomes it. */
    isDefault: boolean('is_default').notNull().default(false),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    uniqueIndex('payment_methods_provider_unique').on(table.providerPaymentMethodId),
    index('payment_methods_account_idx').on(table.driverAccountId, table.status),
    // One default card per account among the cards that are still usable.
    uniqueIndex('payment_methods_default_unique')
      .on(table.driverAccountId)
      .where(sql`${table.status} = 'active' and ${table.isDefault}`),
  ],
);
