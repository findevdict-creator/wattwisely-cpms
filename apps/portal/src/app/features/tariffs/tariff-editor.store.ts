import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Tariff, TariffVersion } from '../../core/api/models/tariff';
import { TariffProposal } from '../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../core/api/tariff-proposals-api.service';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { TariffForm } from './tariff-form';

/** What a save produced: the tariff itself, or a proposal waiting for the Owner. */
export type TariffSaveResult =
  { kind: 'tariff'; tariff: Tariff } | { kind: 'proposal'; proposal: TariffProposal };

/**
 * The tariff editor's data. Saving an existing tariff renames it when the name changed
 * and adds a price version when the prices changed: sessions already running keep the
 * prices they started with. A Managed operator whose changes need the Owner's approval
 * saves a proposal instead (story MGT-03).
 */
@Injectable()
export class TariffEditorStore {
  private readonly tariffsApi = inject(TariffsApiService);
  private readonly proposalsApi = inject(TariffProposalsApiService);

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

  /** Saves the tariff, or proposes the change when this user's changes need approval. */
  async save(isProposal: boolean): Promise<TariffSaveResult> {
    if (isProposal) {
      return { kind: 'proposal', proposal: await this.propose() };
    }
    return { kind: 'tariff', tariff: await this.saveTariff() };
  }

  async archive(): Promise<void> {
    const tariff = this.tariff() as Tariff;
    await firstValueFrom(this.tariffsApi.archive(tariff), { defaultValue: undefined });
  }

  private async propose(): Promise<TariffProposal> {
    const form = this.form();
    const { name, note } = form.fields.getRawValue();
    const tariff = this.tariff();
    const prices = form.toPrices();
    const target = tariff
      ? { tariff_id: tariff.id }
      : { name: name.trim(), currency: form.currency };
    const request = { ...target, prices, ...(note.trim() ? { note: note.trim() } : {}) };
    return firstValueFrom(this.proposalsApi.create(request));
  }

  private async saveTariff(): Promise<Tariff> {
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

  private static pricesKey(form: TariffForm): string {
    return JSON.stringify({ ...form.toPrices(), note: undefined });
  }
}
