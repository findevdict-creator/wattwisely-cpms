import { Injectable, inject, signal } from '@angular/core';
import {
  ApiProblem,
  DriverChargeDetail,
  DriverChargesApiService,
  PublicBranding,
} from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { ReceiptFiles } from '../../core/history/receipt-files';

/**
 * One finished charge for "Session detail" (module 33): the charge with its receipt, the
 * operator's support contact from the plug's branding, and the receipt's PDF.
 */
@Injectable()
export class ReceiptStore {
  private readonly api = inject(DriverChargesApiService);
  private readonly receipts = inject(ReceiptFiles);

  readonly charge = signal<DriverChargeDetail | null>(null);
  readonly branding = signal<PublicBranding | null>(null);
  readonly isDownloading = signal(false);
  readonly error = signal('');

  async load(id: string): Promise<void> {
    this.error.set('');
    try {
      const charge = await firstValueFrom(this.api.charge(id));
      this.charge.set(charge);
      await this.loadBranding(charge);
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.error.set(problem.status === 404 ? 'This charge is not one of yours.' : problem.detail);
    }
  }

  async download(): Promise<void> {
    const charge = this.charge();
    if (!charge) {
      return;
    }
    this.isDownloading.set(true);
    this.error.set(await this.receipts.open(charge));
    this.isDownloading.set(false);
  }

  /** A charger taken away since has no page: the receipt then shows no contact. */
  private async loadBranding(charge: DriverChargeDetail): Promise<void> {
    try {
      const place = await firstValueFrom(
        this.api.place(charge.charger_identity, String(charge.ocpp_connector_id)),
      );
      this.branding.set(place.branding);
    } catch {
      this.branding.set(null);
    }
  }
}
