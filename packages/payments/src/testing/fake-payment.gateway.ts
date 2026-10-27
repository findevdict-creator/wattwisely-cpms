import {
  AccountLinkRequest,
  AccountRequest,
  AccountState,
  CancelRequest,
  CaptureRequest,
  HoldCreated,
  HoldRequest,
  HoldState,
  PaymentGateway,
  ReceivedEvent,
  RefundRequest,
  RefundState,
} from '../gateway/payment-gateway';
import { PaymentGatewayError } from '../gateway/payment-gateway.error';
import {
  CardSetup,
  CardSetupRequest,
  CardSetupState,
  CustomerRequest,
  SavedCardHoldRequest,
} from '../gateway/saved-cards';
import { FakeSavedCards } from './fake-saved-cards';
import { FakeWebhook, FakeWebhooks } from './fake-webhooks';

/**
 * A payment provider in memory for tests: holds, accounts and refunds live in maps, and
 * a test moves a hold on with confirm() or decline() the way a driver's card would. Its
 * webhooks are JSON bodies signed with SIGNATURE; the event's meaning comes from the
 * current state of the object it names, like Stripe's do.
 */
export class FakePaymentGateway implements PaymentGateway {
  static readonly SIGNATURE = 'fake-signature';
  readonly provider = 'fake';
  readonly isEnabled = true;
  readonly holds = new Map<string, HoldState>();
  readonly accounts = new Map<string, AccountState>();
  readonly refunds = new Map<string, RefundState>();
  readonly calls: string[] = [];
  /** Customers, card setups and saved cards (module 19). */
  readonly savedCards = new FakeSavedCards();
  /** When set, every provider call fails with this error (an outage). */
  outage: PaymentGatewayError | null = null;
  private counter = 0;

  publishableKey(): string {
    return 'pk_test_fake';
  }

  async createAccount(request: AccountRequest): Promise<AccountState> {
    this.check('createAccount');
    const account: AccountState = {
      providerAccountId: `acct_fake_${++this.counter}`,
      isChargesEnabled: false,
      isPayoutsEnabled: false,
      isDetailsSubmitted: false,
      country: request.country,
      defaultCurrency: null,
      requirements: { currentlyDue: ['external_account'], pastDue: [], disabledReason: null },
    };
    this.accounts.set(account.providerAccountId, account);
    return account;
  }

  async getAccount(providerAccountId: string): Promise<AccountState> {
    this.check('getAccount');
    return this.accountOf(providerAccountId);
  }

  async createOnboardingLink(request: AccountLinkRequest): Promise<string> {
    this.check('createOnboardingLink');
    return `https://connect.fake/onboard/${request.providerAccountId}`;
  }

  async createDashboardLink(providerAccountId: string): Promise<string> {
    this.check('createDashboardLink');
    return `https://connect.fake/dashboard/${providerAccountId}`;
  }

  async createHold(request: HoldRequest): Promise<HoldCreated> {
    this.check('createHold');
    const hold: HoldState = {
      providerPaymentId: `pi_fake_${++this.counter}`,
      status: 'requires_confirmation',
      amount: request.amount,
      amountCapturable: null,
      amountCaptured: null,
      card: null,
      failure: null,
      clientSecret: `pi_fake_${this.counter}_secret`,
    };
    this.holds.set(hold.providerPaymentId, hold);
    return { ...hold, clientSecret: hold.clientSecret as string };
  }

  async getHold(_accountId: string, providerPaymentId: string): Promise<HoldState> {
    this.check('getHold');
    return this.holdOf(providerPaymentId);
  }

  async capture(request: CaptureRequest): Promise<HoldState> {
    this.check(`capture:${request.amount}:${request.idempotencyKey}`);
    return this.move(request.providerPaymentId, {
      status: 'captured',
      amountCaptured: request.amount,
    });
  }

  async cancel(request: CancelRequest): Promise<HoldState> {
    this.check(`cancel:${request.idempotencyKey}`);
    return this.move(request.providerPaymentId, { status: 'cancelled', amountCapturable: 0 });
  }

  async refund(request: RefundRequest): Promise<RefundState> {
    this.check(`refund:${request.amount}:${request.idempotencyKey}`);
    const refund: RefundState = {
      providerRefundId: `re_fake_${++this.counter}`,
      providerPaymentId: request.providerPaymentId,
      amount: request.amount,
      status: 'succeeded',
      failureMessage: null,
    };
    this.refunds.set(refund.providerRefundId, refund);
    return refund;
  }

  async createCustomer(request: CustomerRequest): Promise<string> {
    this.check('createCustomer');
    return this.savedCards.createCustomer(request);
  }

  async createCardSetup(request: CardSetupRequest): Promise<CardSetup> {
    this.check('createCardSetup');
    return this.savedCards.createSetup(request);
  }

  async getCardSetup(providerSetupId: string): Promise<CardSetupState> {
    this.check('getCardSetup');
    return this.savedCards.getSetup(providerSetupId);
  }

  async detachCard(providerPaymentMethodId: string): Promise<void> {
    this.check('detachCard');
    this.savedCards.detach(providerPaymentMethodId);
  }

  async createSavedCardHold(request: SavedCardHoldRequest): Promise<HoldState> {
    this.check(`createSavedCardHold:${request.amount}:${request.idempotencyKey}`);
    const hold = this.savedCards.hold(request, ++this.counter);
    this.holds.set(hold.providerPaymentId, hold);
    return hold;
  }

  parseWebhook(rawBody: Buffer, signature: string): ReceivedEvent {
    if (signature !== FakePaymentGateway.SIGNATURE) {
      throw PaymentGatewayError.invalidSignature('not the fake signature');
    }
    return this.parseStoredEvent(JSON.parse(rawBody.toString('utf8')));
  }

  parseStoredEvent(payload: unknown): ReceivedEvent {
    return new FakeWebhooks(this.holds, this.refunds, this.accounts).parse(payload as FakeWebhook);
  }

  /** The driver's card confirmed the hold. */
  confirm(providerPaymentId: string, card = { brand: 'visa', last4: '4242' }): HoldState {
    const hold = this.holdOf(providerPaymentId);
    return this.move(providerPaymentId, {
      status: 'authorised',
      amountCapturable: hold.amount,
      card,
    });
  }

  /** The driver's card refused the hold. */
  decline(providerPaymentId: string, message = 'Your card was declined.'): HoldState {
    return this.move(providerPaymentId, {
      status: 'failed',
      failure: { code: 'card_declined', message },
    });
  }

  /** Stripe finished the tenant's onboarding. */
  enable(providerAccountId: string): AccountState {
    const account: AccountState = {
      ...this.accountOf(providerAccountId),
      isChargesEnabled: true,
      isPayoutsEnabled: true,
      isDetailsSubmitted: true,
      defaultCurrency: 'gbp',
      requirements: { currentlyDue: [], pastDue: [], disabledReason: null },
    };
    this.accounts.set(providerAccountId, account);
    return account;
  }

  private move(providerPaymentId: string, change: Partial<HoldState>): HoldState {
    const hold = { ...this.holdOf(providerPaymentId), ...change };
    this.holds.set(providerPaymentId, hold);
    return hold;
  }

  private holdOf(providerPaymentId: string): HoldState {
    const hold = this.holds.get(providerPaymentId);
    if (!hold) {
      throw new PaymentGatewayError('provider_error', `No such hold: ${providerPaymentId}`);
    }
    return hold;
  }

  private accountOf(providerAccountId: string): AccountState {
    const account = this.accounts.get(providerAccountId);
    if (!account) {
      throw new PaymentGatewayError('provider_error', `No such account: ${providerAccountId}`);
    }
    return account;
  }

  private check(call: string): void {
    this.calls.push(call);
    if (this.outage) {
      throw this.outage;
    }
  }
}
