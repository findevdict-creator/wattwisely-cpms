import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import {
  ApiProblem,
  ChargeReading,
  DriverChargeDetail,
  DriverChargesApiService,
} from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';

/** Which of the design's charge screens fits the charge now (Figma 10). */
export type SessionView = 'starting' | 'live' | 'complete' | 'failed';

/**
 * One of the driver's charges, followed every 3 seconds until it is settled, with the power
 * readings every third time while the car charges, for the chart. It can be stopped from here.
 */
@Injectable()
export class SessionStore implements OnDestroy {
  static readonly POLL_MS = 3000;
  static readonly READINGS_EVERY = 3;
  static readonly STARTING = ['authorising', 'starting'];
  static readonly LIVE = ['charging', 'suspended', 'idle', 'stopping'];

  private readonly api = inject(DriverChargesApiService);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  readonly charge = signal<DriverChargeDetail | null>(null);
  readonly readings = signal<ChargeReading[]>([]);
  readonly now = signal(Date.now());
  readonly isStopping = signal(false);
  readonly error = signal('');

  async follow(id: string): Promise<void> {
    this.unfollow();
    this.ticks = 0;
    await this.load(id);
    const charge = this.charge();
    if (charge && !SessionStore.isSettled(charge)) {
      this.timer = setInterval(() => void this.load(id), SessionStore.POLL_MS);
    }
  }

  async load(id: string): Promise<void> {
    try {
      const charge = await firstValueFrom(this.api.charge(id));
      this.charge.set(charge);
      this.now.set(Date.now());
      if (
        SessionStore.view(charge) === 'live' &&
        this.ticks++ % SessionStore.READINGS_EVERY === 0
      ) {
        this.readings.set(await firstValueFrom(this.api.readings(id)));
      }
      if (SessionStore.isSettled(charge)) {
        this.unfollow();
      }
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      this.unfollow();
    }
  }

  async stop(): Promise<void> {
    const charge = this.charge();
    if (!charge) {
      return;
    }
    this.isStopping.set(true);
    this.error.set('');
    try {
      this.charge.set(await firstValueFrom(this.api.stop(charge.id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isStopping.set(false);
    }
  }

  unfollow(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.unfollow();
  }

  static view(charge: DriverChargeDetail): SessionView {
    if (charge.payment?.status === 'failed' || ['not_started', 'failed'].includes(charge.status)) {
      return 'failed';
    }
    if (SessionStore.STARTING.includes(charge.status)) {
      return 'starting';
    }
    return SessionStore.LIVE.includes(charge.status) ? 'live' : 'complete';
  }

  /** Settled once the charge ended and any hold has been taken or released. */
  static isSettled(charge: DriverChargeDetail): boolean {
    const view = SessionStore.view(charge);
    const isEnded = view === 'complete' || view === 'failed';
    return (
      isEnded && charge.payment?.status !== 'authorised' && charge.payment?.status !== 'pending'
    );
  }
}
