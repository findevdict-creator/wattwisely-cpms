/** What the card form needs to open: the provider's keys for this company and this hold. */
export interface CardFormOptions {
  publishableKey: string;
  /** The company's connected account; the form must be opened for it. */
  accountId: string;
  clientSecret: string;
  /** Where a payment method that leaves the page (bank redirects) comes back to. */
  returnUrl: string;
}

/** How the card form ended: the hold is on the card, or the provider said why not. */
export interface CardFormResult {
  isConfirmed: boolean;
  message: string | null;
}

/**
 * The provider's card form as the charge page sees it. Stripe is behind it today
 * (StripeCardForm); a test or another provider can stand in without the page changing.
 */
export interface CardForm {
  /** Draws the form inside the element. */
  mount(host: HTMLElement): Promise<void>;
  /** Sends the card to the provider; the hold is confirmed when it answers yes. */
  confirm(): Promise<CardFormResult>;
  destroy(): void;
}
