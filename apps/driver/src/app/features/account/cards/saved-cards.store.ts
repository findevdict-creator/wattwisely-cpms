import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { DriverChargesApiService } from '../../../core/api/driver-charges-api.service';
import { CardSetup, PaymentMethod } from '../../../core/api/models/driver-payments';

/** The cards saved to the driver's login, and the setup a new one is being typed into (module 19). */
@Injectable()
export class SavedCardsStore {
  private readonly api = inject(DriverChargesApiService);

  readonly cards = signal<PaymentMethod[]>([]);
  readonly isProviderEnabled = signal(true);
  /** The setup the provider's form is open on; null while no card is being added. */
  readonly setup = signal<CardSetup | null>(null);
  readonly isBusy = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    await this.attempt(async () => {
      const methods = await firstValueFrom(this.api.paymentMethods());
      this.cards.set(methods.items);
      this.isProviderEnabled.set(methods.is_provider_enabled);
    });
  }

  /** Opens a setup; the page then shows the provider's form on it. */
  async begin(): Promise<void> {
    await this.attempt(async () => this.setup.set(await firstValueFrom(this.api.setupCard())));
  }

  /** The form confirmed the card: the API keeps it and the list is read again. */
  async finish(): Promise<void> {
    const setup = this.setup();
    if (!setup) {
      return;
    }
    await this.attempt(async () => {
      await firstValueFrom(this.api.saveCard(setup.setup_id));
      this.setup.set(null);
      await this.load();
    });
  }

  cancel(): void {
    this.setup.set(null);
  }

  async makeDefault(card: PaymentMethod): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.api.makeDefault(card.id));
      await this.load();
    });
  }

  async remove(card: PaymentMethod): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.api.removeCard(card.id));
      await this.load();
    });
  }

  private async attempt(work: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
