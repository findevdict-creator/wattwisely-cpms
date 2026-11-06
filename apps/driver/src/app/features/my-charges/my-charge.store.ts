import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiProblem,
  ChargeReading,
  DriverChargeDetail,
  DriverChargeStates,
  DriverChargesApiService,
  PublicBranding,
  ReceiptFileName,
} from '@wattwisely/driver-core';
import { FileSaver } from '../../core/files/file-saver';

/**
 * One of the driver's charges (module 19), followed every 3 seconds while something can still
 * happen to it, with the power readings every third time while the car charges (module 36).
 * It can be stopped from here, and its receipt saved as a PDF once it is priced.
 */
@Injectable()
export class MyChargeStore implements OnDestroy {
  static readonly POLL_MS = 3000;
  static readonly READINGS_EVERY = 3;
  static readonly NOT_READY = 'The receipt is ready once the charge has been priced.';

  private readonly api = inject(DriverChargesApiService);
  private readonly files = inject(FileSaver);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  readonly charge = signal<DriverChargeDetail | null>(null);
  readonly readings = signal<ChargeReading[]>([]);
  /** The operator's name, logo and support contact, from the plug's page. */
  readonly branding = signal<PublicBranding | null>(null);
  /** Ticks with every poll, so the time on the page moves. */
  readonly now = signal(Date.now());
  readonly isBusy = signal(false);
  readonly isDownloading = signal(false);
  readonly error = signal('');

  async follow(id: string): Promise<void> {
    this.stopFollowing();
    this.ticks = 0;
    await this.load(id);
    const charge = this.charge();
    if (charge) {
      void this.loadBranding(charge);
      if (!MyChargeStore.isSettled(charge)) {
        this.timer = setInterval(() => void this.load(id), MyChargeStore.POLL_MS);
      }
    }
  }

  async load(id: string): Promise<void> {
    try {
      const charge = await firstValueFrom(this.api.charge(id));
      this.apply(charge);
      if (
        DriverChargeStates.view(charge) === 'live' &&
        this.ticks++ % MyChargeStore.READINGS_EVERY === 0
      ) {
        this.readings.set(await firstValueFrom(this.api.readings(id)));
      }
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.error.set(problem.status === 404 ? 'This charge is not one of yours.' : problem.detail);
      this.stopFollowing();
    }
  }

  async stop(id: string): Promise<void> {
    this.isBusy.set(true);
    this.error.set('');
    try {
      this.apply(await firstValueFrom(this.api.stop(id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }

  /** Fetches the receipt's PDF with the login and hands it to the browser as a download. */
  async download(): Promise<void> {
    const charge = this.charge();
    if (!charge) {
      return;
    }
    this.isDownloading.set(true);
    this.error.set('');
    try {
      const pdf = await firstValueFrom(this.api.receiptPdf(charge.id));
      this.files.save(pdf, ReceiptFileName.of(charge));
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.error.set(problem.status === 409 ? MyChargeStore.NOT_READY : problem.detail);
    } finally {
      this.isDownloading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.stopFollowing();
  }

  /** Settled once the session ended and any hold has been captured or released. */
  static isSettled(charge: DriverChargeDetail): boolean {
    return DriverChargeStates.isSettled(charge);
  }

  private apply(charge: DriverChargeDetail): void {
    this.charge.set(charge);
    this.now.set(Date.now());
    if (MyChargeStore.isSettled(charge)) {
      this.stopFollowing();
    }
  }

  /** A charger taken away since has no page: the receipt then names no way to reach them. */
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

  private stopFollowing(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
