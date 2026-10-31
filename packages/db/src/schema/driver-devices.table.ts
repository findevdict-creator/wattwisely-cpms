import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { driverAccounts } from './driver-accounts.table';
import { devicePlatform } from './enums';
import { Timestamps } from './timestamps';

/**
 * A phone the mobile app signed in on, and the token that pushes to it (module 34): Firebase
 * Cloud Messaging's on Android, Apple's on iOS. A token belongs to one account at a time: when
 * someone else signs in on the phone, the row moves to them. Signing out deletes it; a token the
 * service calls unknown is marked invalid and skipped. A global table like driver_accounts, with
 * no row-level security: the API reaches it through the driver's own account, the worker through
 * the account a session's driver record is linked to.
 */
export const driverDevices = pgTable(
  'driver_devices',
  {
    id: uuid('id').primaryKey(),
    driverAccountId: uuid('driver_account_id')
      .notNull()
      .references(() => driverAccounts.id),
    platform: devicePlatform('platform').notNull(),
    token: text('token').notNull(),
    /** When the service last refused the token for good; null while it works. */
    invalidAt: timestamp('invalid_at', { withTimezone: true }),
    ...Timestamps.columns(),
  },
  (table) => [
    uniqueIndex('driver_devices_token_unique').on(table.token),
    index('driver_devices_account_idx').on(table.driverAccountId),
  ],
);
