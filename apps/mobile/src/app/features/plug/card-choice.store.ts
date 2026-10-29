import { Injectable, inject, signal } from '@angular/core';
import { ApiProblem, DriverChargesApiService, PaymentMethod } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';

/**
 * The saved cards to pay a charge with (Figma 10, "Start charging"). The API holds the default
 * card, so a card the driver picks becomes the default before the charge starts.
 */
@Injectable()
export class CardChoiceStore {
  private readonly api = inject(DriverChargesApiService);

  readonly cards = signal<PaymentMethod[]>([]);
  readonly chosenId = signal<string | null>(null);
  readonly error = signal('');

  async load(): Promise<void> {
    this.error.set('');
    try {
      const methods = await firstValueFrom(this.api.paymentMethods());
      this.cards.set(methods.items);
      const chosen = methods.items.find((card) => card.is_default) ?? methods.items[0];
      this.chosenId.set(chosen?.id ?? null);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Makes the chosen card the default; false when the API refused. */
  async useChosen(): Promise<boolean> {
    const chosen = this.cards().find((card) => card.id === this.chosenId());
    if (!chosen || chosen.is_default) {
      return true;
    }
    try {
      await firstValueFrom(this.api.makeDefault(chosen.id));
      return true;
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      return false;
    }
  }

  /** "Default · expires 04/28". */
  static expiry(card: PaymentMethod): string {
    const expires = `expires ${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`;
    return card.is_default
      ? `Default · ${expires}`
      : `${expires.charAt(0).toUpperCase()}${expires.slice(1)}`;
  }
}
