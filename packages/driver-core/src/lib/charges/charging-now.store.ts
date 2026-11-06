import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DriverChargesApiService } from '../api/driver-charges-api.service';
import { DriverCharge } from '../api/models/driver-payments';
import { ChargeChips } from '../format/charge-chips';

/**
 * The driver's charge under way, if any, for Home's "Charging now" card (Figma 9, "Home"),
 * in both driver apps (module 37).
 * A failure to load leaves the card out rather than a warning on Home.
 */
@Injectable({ providedIn: 'root' })
export class ChargingNowStore {
  private readonly api = inject(DriverChargesApiService);

  readonly charge = signal<DriverCharge | null>(null);

  async load(): Promise<void> {
    try {
      const charges = await firstValueFrom(this.api.charges());
      this.charge.set(
        charges.items.find((charge) => ChargeChips.isUnderWay(charge.status)) ?? null,
      );
    } catch {
      this.charge.set(null);
    }
  }

  clear(): void {
    this.charge.set(null);
  }
}
