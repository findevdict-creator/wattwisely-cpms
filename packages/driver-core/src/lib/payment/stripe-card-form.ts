import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { PlatformColours } from '@wattwisely/theme';
import { CardForm, CardFormOptions, CardFormResult } from './card-form';

/**
 * Stripe's Payment Element on the company's connected account. Stripe.js is loaded from
 * Stripe's own domain, as its terms require; the publishable key and the account come
 * from the API with the charge, so nothing about the provider is compiled in.
 */
export class StripeCardForm implements CardForm {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  constructor(private readonly options: CardFormOptions) {}

  async mount(host: HTMLElement): Promise<void> {
    this.stripe = await loadStripe(this.options.publishableKey, {
      stripeAccount: this.options.accountId,
    });
    if (!this.stripe) {
      throw new Error('The card form could not be loaded.');
    }
    this.elements = this.stripe.elements({
      clientSecret: this.options.clientSecret,
      appearance: { theme: 'stripe', variables: { colorPrimary: PlatformColours.PRIMARY } },
    });
    this.elements.create('payment', { layout: 'tabs' }).mount(host);
  }

  /** The hold is a manual-capture intent, so a confirmed one ends up "requires capture". */
  async confirm(): Promise<CardFormResult> {
    if (!this.stripe || !this.elements) {
      return { isConfirmed: false, message: 'The card form is not ready yet.' };
    }
    const result = await this.stripe.confirmPayment({
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
