/** A card a driver saved, as the provider describes it. */
export interface SavedCard {
  providerPaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

/** A customer for a driver at the provider, on the platform's own account (module 19). */
export interface CustomerRequest {
  driverAccountId: string;
  email: string;
  name: string;
  idempotencyKey: string;
}

/** Saving a card starts with a setup the driver's page confirms with the provider's card form. */
export interface CardSetupRequest {
  customerId: string;
  idempotencyKey: string;
}

export interface CardSetup {
  providerSetupId: string;
  clientSecret: string;
}

/** Where a card setup stands: the card is saved when `card` is filled in. */
export interface CardSetupState {
  providerSetupId: string;
  status: 'pending' | 'succeeded' | 'failed';
  card: SavedCard | null;
  failureMessage: string | null;
}

/**
 * A hold on a saved card, confirmed at once with no page: the card is copied from the
 * platform customer to the tenant's connected account, and the hold is created on it there.
 */
export interface SavedCardHoldRequest {
  accountId: string;
  customerId: string;
  providerPaymentMethodId: string;
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}
