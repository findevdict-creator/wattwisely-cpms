import { Injectable, inject, signal } from '@angular/core';
import { ChargeChips, DriverCharge, DriverChargesApiService } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';

/**
 * The driver's charge under way, if any, for Home's "Charging now" card (Figma 9, "Home").
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
