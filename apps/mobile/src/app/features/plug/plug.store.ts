import { Injectable, inject, signal } from '@angular/core';
import { ApiProblem, DriverChargesApiService, DriverPlace } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';

/**
 * The plug a QR code named, as the signed-in driver sees it (module 19's API): where it is,
 * what it costs, and whether they may charge on it. The plug, consent and start pages each
 * load it, so a page opened from a link stands on its own.
 */
@Injectable()
export class PlugStore {
  static readonly NOT_FOUND =
    'There is no charger with this code. Check the sticker and try again.';

  private readonly api = inject(DriverChargesApiService);

  readonly place = signal<DriverPlace | null>(null);
  readonly error = signal('');

  async load(identity: string, connector: string): Promise<void> {
    this.error.set('');
    try {
      this.place.set(await firstValueFrom(this.api.place(identity, connector)));
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.error.set(problem.status === 404 ? PlugStore.NOT_FOUND : problem.detail);
    }
  }

  /** The name the driver knows the operator by: its brand, else its account name. */
  static operator(place: DriverPlace): string {
    return place.branding.name || place.operator_name;
  }
}
