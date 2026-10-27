import Stripe from 'stripe';
import {
  CardSetup,
  CardSetupRequest,
  CardSetupState,
  CustomerRequest,
  HoldState,
  SavedCardHoldRequest,
} from '@wattwisely/payments';
import { StripeMapper } from './stripe-mapper';

/**
 * Saved cards at Stripe (module 19): a Customer per driver on the platform account, a
 * SetupIntent the driver's page confirms, and holds that copy the saved PaymentMethod to
 * the tenant's connected account first (Stripe's path for direct charges with a platform
 * customer), then confirm a manual-capture PaymentIntent off-session with it.
 */
export class StripeSavedCards {
  constructor(private readonly stripe: Stripe) {}

  async createCustomer(request: CustomerRequest): Promise<string> {
    const customer = await this.stripe.customers.create(
      {
        email: request.email,
        name: request.name,
        metadata: { driverAccountId: request.driverAccountId },
      },
      { idempotencyKey: request.idempotencyKey },
    );
    return customer.id;
  }

  async createSetup(request: CardSetupRequest): Promise<CardSetup> {
    const setup = await this.stripe.setupIntents.create(
      {
        customer: request.customerId,
        usage: 'off_session',
        allowed_payment_method_types: ['card'],
      },
      { idempotencyKey: request.idempotencyKey },
    );
    return { providerSetupId: setup.id, clientSecret: setup.client_secret ?? '' };
  }

  async getSetup(providerSetupId: string): Promise<CardSetupState> {
    const setup = await this.stripe.setupIntents.retrieve(providerSetupId, {
      expand: ['payment_method'],
    });
    return StripeMapper.setup(setup);
  }

  async detach(providerPaymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(providerPaymentMethodId);
  }

  /** The card is copied to the connected account, then charged there; a refusal comes back as a failed hold. */
  async hold(request: SavedCardHoldRequest): Promise<HoldState> {
    const account = { stripeAccount: request.accountId };
    const copy = await this.stripe.paymentMethods.create(
      { customer: request.customerId, payment_method: request.providerPaymentMethodId },
      { ...account, idempotencyKey: `${request.idempotencyKey}:method` },
    );
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          payment_method: copy.id,
          confirm: true,
          off_session: true,
          capture_method: 'manual',
          description: request.description,
          metadata: request.metadata,
          expand: ['latest_charge'],
        },
        { ...account, idempotencyKey: request.idempotencyKey },
      );
      return StripeMapper.hold(intent);
    } catch (error) {
      return StripeSavedCards.refusedHold(error);
    }
  }

  /** A card error carries the PaymentIntent that failed; anything else is for the caller to translate. */
  private static refusedHold(error: unknown): HoldState {
    const stripeError = error as Stripe.errors.StripeError;
    const intent = (stripeError as Stripe.errors.StripeCardError).payment_intent;
    if (stripeError.type === 'StripeCardError' && intent) {
      return StripeMapper.hold(intent);
    }
    throw error;
  }
}
