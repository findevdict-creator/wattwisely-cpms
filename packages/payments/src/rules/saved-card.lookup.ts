import { and, eq } from 'drizzle-orm';
import { driverAccounts, drivers, paymentMethods, Transaction } from '@wattwisely/db';
import { PaymentMethodRow } from '../store/payment-rows';

/** The saved card a hold can be taken from: the account behind a driver record, its customer and its default card. */
export interface UsableSavedCard {
  driverAccountId: string;
  customerId: string;
  card: PaymentMethodRow;
}

/**
 * Finds the way a driver record can pay (module 19): the login linked to it, with a customer
 * at the provider and a default card that is still usable. Null means a `pay` rule cannot be
 * met, and the charger must refuse the card.
 */
export class SavedCardLookup {
  async forDriver(tx: Transaction, driverId: string): Promise<UsableSavedCard | null> {
    const rows = await tx
      .select({
        driverAccountId: driverAccounts.id,
        customerId: driverAccounts.paymentCustomerId,
        card: paymentMethods,
      })
      .from(drivers)
      .innerJoin(driverAccounts, eq(driverAccounts.id, drivers.driverAccountId))
      .innerJoin(
        paymentMethods,
        and(
          eq(paymentMethods.driverAccountId, driverAccounts.id),
          eq(paymentMethods.status, 'active'),
          eq(paymentMethods.isDefault, true),
        ),
      )
      .where(eq(drivers.id, driverId));
    const row = rows[0];
    return row?.customerId
      ? { driverAccountId: row.driverAccountId, customerId: row.customerId, card: row.card }
      : null;
  }

  /** The same for a login directly, as the app asks before a start. */
  async forAccount(tx: Transaction, driverAccountId: string): Promise<UsableSavedCard | null> {
    const rows = await tx
      .select({ customerId: driverAccounts.paymentCustomerId, card: paymentMethods })
      .from(driverAccounts)
      .innerJoin(
        paymentMethods,
        and(
          eq(paymentMethods.driverAccountId, driverAccounts.id),
          eq(paymentMethods.status, 'active'),
          eq(paymentMethods.isDefault, true),
        ),
      )
      .where(eq(driverAccounts.id, driverAccountId));
    const row = rows[0];
    return row?.customerId ? { driverAccountId, customerId: row.customerId, card: row.card } : null;
  }
}
