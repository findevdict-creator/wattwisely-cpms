import { Injectable, inject, signal } from '@angular/core';
import { CardForm, CardFormFactory, SavedCardsStore } from '@wattwisely/driver-core';

/**
 * "Add a card" (Figma 11) behind the page: opens a setup, draws the provider's form in it,
 * and once the provider has the card, keeps it and makes it the default when asked.
 */
@Injectable()
export class CardAdder {
  static readonly UNAVAILABLE = 'Cards cannot be saved here right now.';

  readonly cards = inject(SavedCardsStore);
  private readonly factory = inject(CardFormFactory);
  private form: CardForm | null = null;

  readonly isReady = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  async open(host: HTMLElement): Promise<void> {
    this.close();
    await this.cards.load();
    await this.cards.begin();
    const setup = this.cards.setup();
    if (!setup?.publishable_key || !this.cards.isProviderEnabled()) {
      this.error.set(this.cards.error() || CardAdder.UNAVAILABLE);
      return;
    }
    this.form = this.factory.createSaver({
      publishableKey: setup.publishable_key,
      clientSecret: setup.client_secret,
      returnUrl: window.location.href,
    });
    try {
      await this.form.mount(host);
      this.isReady.set(true);
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  /** True once the card is kept; the page then goes back. */
  async save(isDefault: boolean): Promise<boolean> {
    if (!this.form) {
      return false;
    }
    this.isSaving.set(true);
    this.error.set('');
    const before = new Set(this.cards.cards().map((card) => card.id));
    const result = await this.form.confirm();
    if (result.isConfirmed) {
      await this.cards.finish();
      const added = this.cards.cards().find((card) => !before.has(card.id));
      if (isDefault && added && !added.is_default) {
        await this.cards.makeDefault(added);
      }
    }
    this.isSaving.set(false);
    this.error.set(
      result.isConfirmed ? this.cards.error() : (result.message ?? 'The card was refused.'),
    );
    return result.isConfirmed && !this.cards.error();
  }

  close(): void {
    this.form?.destroy();
    this.form = null;
    this.isReady.set(false);
    this.error.set('');
    this.cards.cancel();
  }
}
