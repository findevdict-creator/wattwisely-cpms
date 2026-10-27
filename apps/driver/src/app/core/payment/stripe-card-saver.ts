import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { PlatformColours } from '@wattwisely/theme';
import { CardForm, CardFormResult } from './card-form';

/** What the saving form needs: the platform's key and the setup the API opened. */
export interface CardSaverOptions {
  publishableKey: string;
  clientSecret: string;
  returnUrl: string;
}

/**
 * Stripe's Payment Element saving a card on the platform's own account (module 19): no
 * connected account here, because one saved card serves every operator. Each hold later
 * copies the card to the operator's account; nothing is charged now.
 */
export class StripeCardSaver implements CardForm {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  constructor(private readonly options: CardSaverOptions) {}

  async mount(host: HTMLElement): Promise<void> {
    this.stripe = await loadStripe(this.options.publishableKey);
    if (!this.stripe) {
      throw new Error('The card form could not be loaded.');
    }
    this.elements = this.stripe.elements({
      clientSecret: this.options.clientSecret,
      appearance: { theme: 'stripe', variables: { colorPrimary: PlatformColours.PRIMARY } },
    });
    this.elements.create('payment', { layout: 'tabs' }).mount(host);
  }

  async confirm(): Promise<CardFormResult> {
    if (!this.stripe || !this.elements) {
      return { isConfirmed: false, message: 'The card form is not ready yet.' };
    }
    const result = await this.stripe.confirmSetup({
      elements: this.elements,
      confirmParams: { return_url: this.options.returnUrl },
      redirect: 'if_required',
    });
    if (result.error) {
      return { isConfirmed: false, message: result.error.message ?? 'The card was refused.' };
    }
    return { isConfirmed: true, message: null };
  }

  destroy(): void {
    this.elements?.getElement('payment')?.destroy();
    this.elements = null;
  }
}
