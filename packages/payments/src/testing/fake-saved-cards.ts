import { HoldState } from '../gateway/payment-gateway';
import { PaymentGatewayError } from '../gateway/payment-gateway.error';
import {
  CardSetup,
  CardSetupRequest,
  CardSetupState,
  CustomerRequest,
  SavedCard,
  SavedCardHoldRequest,
} from '../gateway/saved-cards';

/**
 * The saved-card side of the fake provider (module 19): customers, card setups a test
 * completes with `completeSetup`, and holds on saved cards that are confirmed at once,
 * or refused for the cards listed in `refusedCards`.
 */
export class FakeSavedCards {
  static readonly VISA: Omit<SavedCard, 'providerPaymentMethodId'> = {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
  };

  readonly customers = new Map<string, CustomerRequest>();
  readonly setups = new Map<string, CardSetupState>();
  /** Cards (by provider payment method id) whose holds the bank refuses. */
  readonly refusedCards = new Set<string>();
  readonly detached: string[] = [];
  private counter = 0;

  createCustomer(request: CustomerRequest): string {
    const id = `cus_fake_${++this.counter}`;
    this.customers.set(id, request);
    return id;
  }

  createSetup(request: CardSetupRequest): CardSetup {
    if (!this.customers.has(request.customerId)) {
      throw new PaymentGatewayError('provider_error', `No such customer: ${request.customerId}`);
    }
    const id = `seti_fake_${++this.counter}`;
    this.setups.set(id, {
      providerSetupId: id,
      status: 'pending',
      card: null,
      failureMessage: null,
    });
    return { providerSetupId: id, clientSecret: `${id}_secret` };
  }

  getSetup(providerSetupId: string): CardSetupState {
    const setup = this.setups.get(providerSetupId);
    if (!setup) {
      throw new PaymentGatewayError('provider_error', `No such setup: ${providerSetupId}`);
    }
    return setup;
  }

  /** The driver typed a card into the setup form: the setup now carries the saved card. */
  completeSetup(providerSetupId: string, card = FakeSavedCards.VISA): SavedCard {
    const saved = { ...card, providerPaymentMethodId: `pm_fake_${++this.counter}` };
    this.setups.set(providerSetupId, {
      ...this.getSetup(providerSetupId),
      status: 'succeeded',
      card: saved,
    });
    return saved;
  }

  detach(providerPaymentMethodId: string): void {
    this.detached.push(providerPaymentMethodId);
  }

  /** A hold confirmed on the spot, as the bank would answer an off-session charge. */
  hold(request: SavedCardHoldRequest, counter: number): HoldState {
    const isRefused = this.refusedCards.has(request.providerPaymentMethodId);
    const card = this.cardOf(request.providerPaymentMethodId);
    return {
      providerPaymentId: `pi_fake_${counter}`,
      status: isRefused ? 'failed' : 'authorised',
      amount: request.amount,
      amountCapturable: isRefused ? null : request.amount,
      amountCaptured: null,
      card: card ? { brand: card.brand, last4: card.last4 } : null,
      failure: isRefused ? { code: 'card_declined', message: 'Your card was declined.' } : null,
      clientSecret: null,
    };
  }

  private cardOf(providerPaymentMethodId: string): SavedCard | null {
    for (const setup of this.setups.values()) {
      if (setup.card?.providerPaymentMethodId === providerPaymentMethodId) {
        return setup.card;
      }
    }
    return null;
  }
}
