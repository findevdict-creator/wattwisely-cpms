import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Tariff, TariffVersion } from '../../core/api/models/tariff';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { TariffForm } from './tariff-form';

/**
 * The tariff editor's data. Saving an existing tariff renames it when the name changed
 * and adds a price version when the prices changed: sessions already running keep the
 * prices they started with.
 */
@Injectable()
export class TariffEditorStore {
  private readonly tariffsApi = inject(TariffsApiService);

  readonly tariff = signal<Tariff | null>(null);
  readonly versions = signal<TariffVersion[]>([]);
  readonly form = signal(new TariffForm());
  /** The prices as loaded, to tell whether a save needs a new version. */
  private savedPrices = '';

  async load(id: string, isEditable: boolean): Promise<void> {
    const [tariff, versions] = await Promise.all([
      firstValueFrom(this.tariffsApi.get(id)),
      firstValueFrom(this.tariffsApi.versions(id)),
    ]);
    const form = TariffForm.from(tariff);
    if (!isEditable || tariff.status !== 'active') {
      form.fields.disable();
      form.bands.disable();
    }
    this.tariff.set(tariff);
    this.versions.set(versions);
    this.form.set(form);
    this.savedPrices = TariffEditorStore.pricesKey(form);
  }

  /** The saved tariff. */
  async save(): Promise<Tariff> {
    const form = this.form();
    const name = form.fields.getRawValue().name.trim();
    let tariff = this.tariff();
    if (!tariff) {
      const input = { name, currency: form.currency, prices: form.toPrices() };
      return firstValueFrom(this.tariffsApi.create(input));
    }
    if (name !== tariff.name) {
      tariff = await firstValueFrom(this.tariffsApi.rename(tariff, name));
    }
    if (TariffEditorStore.pricesKey(form) !== this.savedPrices) {
      tariff = await firstValueFrom(this.tariffsApi.addVersion(tariff, form.toPrices()));
    }
    return tariff;
  }

  async archive(): Promise<void> {
    const tariff = this.tariff() as Tariff;
    await firstValueFrom(this.tariffsApi.archive(tariff), { defaultValue: undefined });
  }

  private static pricesKey(form: TariffForm): string {
    return JSON.stringify({ ...form.toPrices(), note: undefined });
  }
}
