import Stripe from 'stripe';
import {
  AccountLinkRequest,
  AccountRequest,
  AccountState,
  CancelRequest,
  CaptureRequest,
  CardSetup,
  CardSetupRequest,
  CardSetupState,
  CustomerRequest,
  HoldCreated,
  HoldRequest,
  HoldState,
  PaymentGateway,
  PaymentGatewayError,
  ReceivedEvent,
  RefundRequest,
  RefundState,
  SavedCardHoldRequest,
} from '@wattwisely/payments';
import { StripeAccounts } from './stripe-accounts';
import { StripeMapper } from './stripe-mapper';
import { StripeSavedCards } from './stripe-saved-cards';

/** The keys the gateway needs. The webhook secret may be empty while webhooks are not set up. */
export interface StripeKeys {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

/**
 * Stripe Connect as the PaymentGateway (Stripe Payments design): Express accounts for
 * tenants, PaymentIntents with manual capture on the tenant's account for holds, and
 * Connect webhooks verified with the endpoint secret. Every write carries the caller's
 * idempotency key, so a retry can never charge twice.
 */
export class StripeGateway implements PaymentGateway {
  static readonly WEBHOOK_TOLERANCE_S = 300;
  /** A capture or cancel on a hold that is not where we think it is: read it back instead of failing. */
  static readonly STATE_ERRORS = ['payment_intent_unexpected_state', 'charge_already_captured'];

  readonly provider = 'stripe';
  readonly isEnabled = true;
  private readonly stripe: Stripe;
  private readonly accounts: StripeAccounts;
  private readonly savedCards: StripeSavedCards;

  constructor(private readonly keys: StripeKeys) {
    this.stripe = new Stripe(keys.secretKey, { typescript: true });
    this.accounts = new StripeAccounts(this.stripe);
    this.savedCards = new StripeSavedCards(this.stripe);
  }

  publishableKey(): string | null {
    return this.keys.publishableKey || null;
  }

  createAccount(request: AccountRequest): Promise<AccountState> {
    return this.call(() => this.accounts.create(request));
  }

  getAccount(providerAccountId: string): Promise<AccountState> {
    return this.call(() => this.accounts.get(providerAccountId));
  }

  createOnboardingLink(request: AccountLinkRequest): Promise<string> {
    return this.call(() => this.accounts.onboardingLink(request));
  }

  createDashboardLink(providerAccountId: string): Promise<string> {
    return this.call(() => this.accounts.dashboardLink(providerAccountId));
  }

  async createHold(request: HoldRequest): Promise<HoldCreated> {
    const intent = await this.call(() =>
      this.stripe.paymentIntents.create(
        {
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true },
          description: request.description,
          metadata: request.metadata,
        },
        { stripeAccount: request.accountId, idempotencyKey: request.idempotencyKey },
      ),
    );
    return { ...StripeMapper.hold(intent), clientSecret: intent.client_secret ?? '' };
  }

  async getHold(accountId: string, providerPaymentId: string): Promise<HoldState> {
    const intent = await this.call(() =>
      this.stripe.paymentIntents.retrieve(
        providerPaymentId,
        { expand: ['latest_charge'] },
        { stripeAccount: accountId },
      ),
    );
    return StripeMapper.hold(intent);
  }

  async capture(request: CaptureRequest): Promise<HoldState> {
    return this.settle(request, () =>
      this.stripe.paymentIntents.capture(
        request.providerPaymentId,
        { amount_to_capture: request.amount, expand: ['latest_charge'] },
        { stripeAccount: request.accountId, idempotencyKey: request.idempotencyKey },
      ),
    );
  }

  async cancel(request: CancelRequest): Promise<HoldState> {
    return this.settle(request, () =>
      this.stripe.paymentIntents.cancel(
        request.providerPaymentId,
        { cancellation_reason: 'requested_by_customer' },
        { stripeAccount: request.accountId, idempotencyKey: request.idempotencyKey },
      ),
    );
  }

  async refund(request: RefundRequest): Promise<RefundState> {
    const refund = await this.call(() =>
      this.stripe.refunds.create(
        {
          payment_intent: request.providerPaymentId,
          amount: request.amount,
          metadata: { ...request.metadata, reason: request.reason },
        },
        { stripeAccount: request.accountId, idempotencyKey: request.idempotencyKey },
      ),
    );
    return StripeMapper.refund(refund);
  }

  createCustomer(request: CustomerRequest): Promise<string> {
    return this.call(() => this.savedCards.createCustomer(request));
  }

  createCardSetup(request: CardSetupRequest): Promise<CardSetup> {
    return this.call(() => this.savedCards.createSetup(request));
  }

  getCardSetup(providerSetupId: string): Promise<CardSetupState> {
    return this.call(() => this.savedCards.getSetup(providerSetupId));
  }

  detachCard(providerPaymentMethodId: string): Promise<void> {
    return this.call(() => this.savedCards.detach(providerPaymentMethodId));
  }

  deleteCustomer(providerCustomerId: string): Promise<void> {
    return this.call(() => this.savedCards.deleteCustomer(providerCustomerId));
  }

  createSavedCardHold(request: SavedCardHoldRequest): Promise<HoldState> {
    return this.call(() => this.savedCards.hold(request));
  }

  parseWebhook(rawBody: Buffer, signature: string): ReceivedEvent {
    if (!this.keys.webhookSecret) {
      throw PaymentGatewayError.invalidSignature('STRIPE_WEBHOOK_SECRET is not set');
    }
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.keys.webhookSecret,
        StripeGateway.WEBHOOK_TOLERANCE_S,
      );
      return StripeMapper.event(event);
    } catch (error) {
      throw PaymentGatewayError.invalidSignature((error as Error).message);
    }
  }

  parseStoredEvent(payload: unknown): ReceivedEvent {
    return StripeMapper.event(payload as Stripe.Event);
  }

  /** A capture or cancel; when Stripe says the hold is already elsewhere, its current state is the answer. */
  private async settle(
    request: { accountId: string; providerPaymentId: string },
    action: () => Promise<Stripe.PaymentIntent>,
  ): Promise<HoldState> {
    try {
      return StripeMapper.hold(await action());
    } catch (error) {
      const code = (error as Stripe.errors.StripeError).code ?? '';
      if (StripeGateway.STATE_ERRORS.includes(code)) {
        return this.getHold(request.accountId, request.providerPaymentId);
      }
      throw StripeGateway.translate(error);
    }
  }

  private async call<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw StripeGateway.translate(error);
    }
  }

  /** Stripe's error kinds, as the platform's: a card refusal is final, an outage is worth a retry. */
  private static translate(error: unknown): PaymentGatewayError {
    if (error instanceof PaymentGatewayError) {
      return error;
    }
    const stripeError = error as Stripe.errors.StripeError;
    const message = stripeError.message ?? String(error);
    switch (stripeError.type) {
      case 'StripeCardError':
        return new PaymentGatewayError('card_declined', message, false);
      case 'StripeInvalidRequestError':
      case 'StripeAuthenticationError':
      case 'StripePermissionError':
        return new PaymentGatewayError('provider_error', message, false);
      default:
        return new PaymentGatewayError('provider_error', message, true);
    }
  }
}
