import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverChargesApiService } from '../../core/api/driver-charges-api.service';
import { DriverChargeDetail } from '../../core/api/models/driver-payments';

/**
 * One of the driver's charges, followed every few seconds while something can still happen
 * to it, as the anonymous charge page does; it can be stopped from here.
 */
@Injectable()
export class MyChargeStore implements OnDestroy {
  static readonly POLL_MS = 3000;
  static readonly SETTLED = ['completed', 'not_started', 'failed'];

  private readonly api = inject(DriverChargesApiService);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly charge = signal<DriverChargeDetail | null>(null);
  readonly isBusy = signal(false);
  readonly error = signal('');

  async follow(id: string): Promise<void> {
    await this.load(id);
    this.timer = setInterval(() => void this.load(id), MyChargeStore.POLL_MS);
  }

  async load(id: string): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.api.charge(id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
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

  ngOnDestroy(): void {
    this.stopFollowing();
  }

  /** Settled once the session ended and any hold has been captured or released. */
  static isSettled(charge: DriverChargeDetail): boolean {
    const isEnded = MyChargeStore.SETTLED.includes(charge.status);
    return isEnded && charge.payment?.status !== 'authorised';
  }

  private apply(charge: DriverChargeDetail): void {
    this.charge.set(charge);
    if (MyChargeStore.isSettled(charge)) {
      this.stopFollowing();
    }
  }

  private stopFollowing(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
