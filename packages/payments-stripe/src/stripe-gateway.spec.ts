import Stripe from 'stripe';
import { PaymentGatewayError } from '@wattwisely/payments';
import { StripeGateway } from './stripe-gateway';
import { StripeMapper } from './stripe-mapper';

/** Stripe's objects and signed webhooks translated into the platform's words, with no network. */
describe('StripeGateway webhooks', () => {
  const secret = 'whsec_test';
  const gateway = new StripeGateway({
    secretKey: 'sk_test_fake',
    publishableKey: 'pk_test_fake',
    webhookSecret: secret,
  });

  const signed = (event: object) => {
    const payload = JSON.stringify(event);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    return gateway.parseWebhook(Buffer.from(payload), signature);
  };

  const event = (type: string, object: object, account = 'acct_1') => ({
    id: 'evt_1',
    object: 'event',
    type,
    account,
    created: 1_773_000_000,
    data: { object },
  });

  it('reads a confirmed hold with its card', () => {
    const received = signed(
      event('payment_intent.amount_capturable_updated', {
        id: 'pi_1',
        object: 'payment_intent',
        status: 'requires_capture',
        amount: 5000,
        amount_capturable: 5000,
        amount_received: 0,
        client_secret: 'pi_1_secret',
        latest_charge: {
          id: 'ch_1',
          payment_method_details: { card: { brand: 'visa', last4: '4242' } },
        },
        last_payment_error: null,
      }),
    );

    expect(received).toMatchObject({
      id: 'evt_1',
      accountId: 'acct_1',
      createdAt: new Date(1_773_000_000_000),
      event: {
        kind: 'hold_changed',
        hold: {
          providerPaymentId: 'pi_1',
          status: 'authorised',
          amount: 5000,
          amountCapturable: 5000,
          card: { brand: 'visa', last4: '4242' },
          failure: null,
          clientSecret: 'pi_1_secret',
        },
      },
    });
  });

  it('reads a refused card, a captured hold and a cancelled one', () => {
    const refused = StripeMapper.hold({
      id: 'pi_2',
      status: 'requires_payment_method',
      amount: 5000,
      amount_capturable: 0,
      amount_received: 0,
      last_payment_error: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'No funds.',
      },
    } as unknown as Stripe.PaymentIntent);
    expect(refused).toMatchObject({
      status: 'failed',
      failure: { code: 'insufficient_funds', message: 'No funds.' },
    });
    expect(StripeMapper.holdStatus({ status: 'succeeded' } as Stripe.PaymentIntent)).toBe(
      'captured',
    );
    expect(StripeMapper.holdStatus({ status: 'canceled' } as Stripe.PaymentIntent)).toBe(
      'cancelled',
    );
    expect(
      StripeMapper.holdStatus({ status: 'requires_payment_method' } as Stripe.PaymentIntent),
    ).toBe('requires_confirmation');
  });

  it('reads an account update and a refund, and ignores the rest', () => {
    const account = signed(
      event('account.updated', {
        id: 'acct_1',
        object: 'account',
        charges_enabled: true,
        payouts_enabled: false,
        details_submitted: true,
        country: 'GB',
        default_currency: 'gbp',
        requirements: { currently_due: ['external_account'], past_due: [], disabled_reason: null },
      }),
    );
    expect(account.event).toEqual({
      kind: 'account_changed',
      account: {
        providerAccountId: 'acct_1',
        isChargesEnabled: true,
        isPayoutsEnabled: false,
        isDetailsSubmitted: true,
        country: 'GB',
        defaultCurrency: 'GBP',
        requirements: { currentlyDue: ['external_account'], pastDue: [], disabledReason: null },
      },
    });

    const refund = signed(
      event('refund.updated', {
        id: 're_1',
        object: 'refund',
        payment_intent: 'pi_1',
        amount: 500,
        status: 'succeeded',
        failure_reason: null,
      }),
    );
    expect(refund.event).toEqual({
      kind: 'refund_changed',
      refund: {
        providerRefundId: 're_1',
        providerPaymentId: 'pi_1',
        amount: 500,
        status: 'succeeded',
        failureMessage: null,
      },
    });
    expect(signed(event('charge.succeeded', { id: 'ch_1' })).event).toEqual({ kind: 'ignored' });
  });

  it('refuses a forged or stale signature', () => {
    const payload = JSON.stringify(event('account.updated', { id: 'acct_1' }));
    const forged = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });
    const stale = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });

    expect(() => gateway.parseWebhook(Buffer.from(payload), forged)).toThrow(PaymentGatewayError);
    expect(() => gateway.parseWebhook(Buffer.from(payload), stale)).toThrow(PaymentGatewayError);
    const noSecret = new StripeGateway({
      secretKey: 'sk',
      publishableKey: 'pk',
      webhookSecret: '',
    });
    expect(() => noSecret.parseWebhook(Buffer.from(payload), forged)).toThrow(
      'STRIPE_WEBHOOK_SECRET',
    );
  });

  it('reads a card setup and the card it saved', () => {
    const method = {
      id: 'pm_1',
      card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
    } as unknown as Stripe.PaymentMethod;
    expect(
      StripeMapper.setup({
        id: 'seti_1',
        status: 'succeeded',
        payment_method: method,
        last_setup_error: null,
      } as unknown as Stripe.SetupIntent),
    ).toEqual({
      providerSetupId: 'seti_1',
      status: 'succeeded',
      card: {
        providerPaymentMethodId: 'pm_1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
      },
      failureMessage: null,
    });
    expect(
      StripeMapper.setup({
        id: 'seti_2',
        status: 'requires_payment_method',
        payment_method: 'pm_2',
        last_setup_error: { message: 'Card declined.' },
      } as unknown as Stripe.SetupIntent),
    ).toMatchObject({ status: 'pending', card: null, failureMessage: 'Card declined.' });
    expect(
      StripeMapper.setup({ id: 'seti_3', status: 'canceled' } as unknown as Stripe.SetupIntent)
        .status,
    ).toBe('failed');
    expect(
      StripeMapper.savedCard({ id: 'pm_3', card: null } as unknown as Stripe.PaymentMethod),
    ).toBeNull();
  });
});
