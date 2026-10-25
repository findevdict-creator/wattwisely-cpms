import {
  CardSetup,
  CardSetupRequest,
  CardSetupState,
  CustomerRequest,
  SavedCardHoldRequest,
} from './saved-cards';

/** Where a hold stands at the provider, in the platform's own words. */
export type HoldStatus =
  'requires_confirmation' | 'authorised' | 'captured' | 'cancelled' | 'failed';

/** What the provider reports about a hold (a PaymentIntent at Stripe). Amounts are minor units. */
export interface HoldState {
  providerPaymentId: string;
  status: HoldStatus;
  amount: number;
  amountCapturable: number | null;
  amountCaptured: number | null;
  card: { brand: string; last4: string } | null;
  failure: { code: string | null; message: string } | null;
  /** What the driver's page needs to confirm the hold with the provider's card form, while it still can. */
  clientSecret: string | null;
}

/** A hold to put on a driver's card before the charger starts. */
export interface HoldRequest {
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  /** sessionId, tenantId, chargerId, connectorId: every object at the provider names its session. */
  metadata: Record<string, string>;
  idempotencyKey: string;
}

/** A new hold: it always carries the secret the driver's page confirms it with. */
export interface HoldCreated extends HoldState {
  clientSecret: string;
}

export interface CaptureRequest {
  accountId: string;
  providerPaymentId: string;
  amount: number;
  idempotencyKey: string;
}

export interface CancelRequest {
  accountId: string;
  providerPaymentId: string;
  idempotencyKey: string;
}

export interface RefundRequest {
  accountId: string;
  providerPaymentId: string;
  amount: number;
  reason: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface RefundState {
  providerRefundId: string;
  providerPaymentId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  failureMessage: string | null;
}

/** What the platform asks the provider to open for a tenant. */
export interface AccountRequest {
  tenantId: string;
  tenantName: string;
  country: string;
  email: string | null;
  idempotencyKey: string;
}

/** The tenant's connected account as the provider reports it. */
export interface AccountState {
  providerAccountId: string;
  isChargesEnabled: boolean;
  isPayoutsEnabled: boolean;
  isDetailsSubmitted: boolean;
  country: string;
  defaultCurrency: string | null;
  requirements: { currentlyDue: string[]; pastDue: string[]; disabledReason: string | null };
}

export interface AccountLinkRequest {
  providerAccountId: string;
  refreshUrl: string;
  returnUrl: string;
}

/** A webhook event, verified and translated. `ignored` is anything the platform has no use for. */
export type PaymentEvent =
  | { kind: 'hold_changed'; hold: HoldState }
  | { kind: 'refund_changed'; refund: RefundState }
  | { kind: 'account_changed'; account: AccountState }
  | { kind: 'ignored' };

export interface ReceivedEvent {
  /** The provider's own event id, unique for ever. */
  id: string;
  type: string;
  /** The connected account the event is about; null for events about the platform itself. */
  accountId: string | null;
  createdAt: Date;
  event: PaymentEvent;
  /** The raw event, kept so a failed one can be handled again later. */
  payload: unknown;
}

/**
 * Everything the platform asks of a payment provider (Stripe Payments design, "Behind an
 * interface"). Sessions, the worker and the portal only know this interface; Stripe is one
 * implementation, and another provider or a managed-payments mode is another.
 */
export interface PaymentGateway {
  readonly provider: string;
  /** False when no provider is configured: every call then fails with `payments_unavailable`. */
  readonly isEnabled: boolean;
  /** The key the driver's page needs for the provider's card form, when there is one. */
  publishableKey(): string | null;
  createAccount(request: AccountRequest): Promise<AccountState>;
  getAccount(providerAccountId: string): Promise<AccountState>;
  createOnboardingLink(request: AccountLinkRequest): Promise<string>;
  createDashboardLink(providerAccountId: string): Promise<string>;
  createHold(request: HoldRequest): Promise<HoldCreated>;
  getHold(accountId: string, providerPaymentId: string): Promise<HoldState>;
  capture(request: CaptureRequest): Promise<HoldState>;
  cancel(request: CancelRequest): Promise<HoldState>;
  refund(request: RefundRequest): Promise<RefundState>;
  /** Verifies a webhook's signature and translates it; throws PaymentGatewayError on a bad signature. */
  parseWebhook(rawBody: Buffer, signature: string): ReceivedEvent;
  /** Translates an event stored earlier, for a retry. */
  parseStoredEvent(payload: unknown): ReceivedEvent;
  /** A driver's customer on the platform account (module 19); returns the provider's id. */
  createCustomer(request: CustomerRequest): Promise<string>;
  /** Begins saving a card: the driver's page confirms the setup with the card form. */
  createCardSetup(request: CardSetupRequest): Promise<CardSetup>;
  getCardSetup(providerSetupId: string): Promise<CardSetupState>;
  /** Forgets a saved card at the provider. */
  detachCard(providerPaymentMethodId: string): Promise<void>;
  /** A hold on a saved card, confirmed at once; a refusal is a failed HoldState or a card_declined error. */
  createSavedCardHold(request: SavedCardHoldRequest): Promise<HoldState>;
}
