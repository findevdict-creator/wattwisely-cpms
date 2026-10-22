import Stripe from 'stripe';
import {
  AccountState,
  HoldState,
  HoldStatus,
  PaymentEvent,
  ReceivedEvent,
  RefundState,
} from '@wattwisely/payments';

/** Translates Stripe's objects and events into the platform's own words. */
export class StripeMapper {
  /** The Stripe event types that say something about a PaymentIntent. */
  static readonly HOLD_EVENTS = [
    'payment_intent.amount_capturable_updated',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
  ];

  static hold(intent: Stripe.PaymentIntent): HoldState {
    return {
      providerPaymentId: intent.id,
      status: StripeMapper.holdStatus(intent),
      amount: intent.amount,
      amountCapturable: intent.amount_capturable,
      amountCaptured: intent.amount_received,
      card: StripeMapper.cardOf(intent),
      failure: StripeMapper.failureOf(intent),
      clientSecret: intent.client_secret ?? null,
    };
  }

  /** The card of the latest charge, when Stripe expanded it. */
  private static cardOf(intent: Stripe.PaymentIntent): HoldState['card'] {
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const card = charge?.payment_method_details?.card ?? null;
    return card?.last4 ? { brand: card.brand ?? 'card', last4: card.last4 } : null;
  }

  private static failureOf(intent: Stripe.PaymentIntent): HoldState['failure'] {
    const failure = intent.last_payment_error;
    if (!failure) {
      return null;
    }
    return { code: failure.decline_code ?? failure.code ?? null, message: failure.message ?? '' };
  }

  static holdStatus(intent: Stripe.PaymentIntent): HoldStatus {
    switch (intent.status) {
      case 'requires_capture':
        return 'authorised';
      case 'succeeded':
        return 'captured';
      case 'canceled':
        return 'cancelled';
      case 'requires_payment_method':
        return intent.last_payment_error ? 'failed' : 'requires_confirmation';
      default:
        return 'requires_confirmation';
    }
  }

  static account(account: Stripe.Account): AccountState {
    return {
      providerAccountId: account.id,
      isChargesEnabled: account.charges_enabled ?? false,
      isPayoutsEnabled: account.payouts_enabled ?? false,
      isDetailsSubmitted: account.details_submitted ?? false,
      country: account.country ?? '',
      defaultCurrency: account.default_currency?.toUpperCase() ?? null,
      requirements: StripeMapper.requirementsOf(account.requirements),
    };
  }

  private static requirementsOf(
    requirements: Stripe.Account.Requirements | null | undefined,
  ): AccountState['requirements'] {
    return {
      currentlyDue: requirements?.currently_due ?? [],
      pastDue: requirements?.past_due ?? [],
      disabledReason: requirements?.disabled_reason ?? null,
    };
  }

  static refund(refund: Stripe.Refund): RefundState {
    const intent = refund.payment_intent;
    return {
      providerRefundId: refund.id,
      providerPaymentId: typeof intent === 'string' ? intent : (intent?.id ?? ''),
      amount: refund.amount,
      status: StripeMapper.refundStatus(refund.status),
      failureMessage: refund.failure_reason ?? null,
    };
  }

  static refundStatus(status: string | null): RefundState['status'] {
    if (status === 'succeeded') {
      return 'succeeded';
    }
    return status === 'failed' || status === 'canceled' ? 'failed' : 'pending';
  }

  static event(event: Stripe.Event): ReceivedEvent {
    return {
      id: event.id,
      type: event.type,
      accountId: event.account ?? null,
      createdAt: new Date(event.created * 1000),
      event: StripeMapper.meaningOf(event),
      payload: event,
    };
  }

  private static meaningOf(event: Stripe.Event): PaymentEvent {
    const object = event.data.object as Stripe.Event.Data.Object;
    if (StripeMapper.HOLD_EVENTS.includes(event.type)) {
      return { kind: 'hold_changed', hold: StripeMapper.hold(object as Stripe.PaymentIntent) };
    }
    if (event.type === 'refund.updated' || event.type === 'refund.created') {
      return { kind: 'refund_changed', refund: StripeMapper.refund(object as Stripe.Refund) };
    }
    if (event.type === 'account.updated') {
      return { kind: 'account_changed', account: StripeMapper.account(object as Stripe.Account) };
    }
    return { kind: 'ignored' };
  }
}
