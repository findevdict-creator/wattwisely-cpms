import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiProblem,
  Charge,
  ChargePhases,
  MyChargesStore,
  PublicApiService,
} from '@wattwisely/driver-core';

/**
 * One charge as the page follows it. While anything can still happen it asks the API
 * every few seconds (the public API has no live stream; a few seconds is close enough
 * for a cost that the worker updates every 30 seconds) and stops once the money has moved.
 */
@Injectable()
export class ChargeStore implements OnDestroy {
  static readonly POLL_MS = 3000;

  private readonly api = inject(PublicApiService);
  private readonly myCharges = inject(MyChargesStore);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly charge = signal<Charge | null>(null);
  readonly error = signal('');
  readonly isBusy = signal(false);
  /** Ticks with every poll, so durations on the page move. */
  readonly now = signal(Date.now());

  /** Loads the charge and keeps following it while it is live. */
  async follow(key: string, isReturningFromCard: boolean): Promise<void> {
    await (isReturningFromCard ? this.check(key) : this.load(key));
    this.timer = setInterval(() => void this.load(key), ChargeStore.POLL_MS);
  }

  async load(key: string): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.api.charge(key)));
    } catch (error) {
      this.error.set(ChargeStore.wordsFor(ApiProblem.from(error)));
      this.stopFollowing();
    }
  }

  /** The card form finished: the API looks at the hold now and starts the charger. */
  async check(key: string): Promise<void> {
    await this.attempt(() => this.api.check(key));
  }

  async stop(key: string): Promise<void> {
    await this.attempt(() => this.api.stop(key));
  }

  ngOnDestroy(): void {
    this.stopFollowing();
  }

  private async attempt(request: () => ReturnType<PublicApiService['charge']>): Promise<void> {
    this.isBusy.set(true);
    this.error.set('');
    try {
      this.apply(await firstValueFrom(request()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }

  private apply(charge: Charge): void {
    this.charge.set(charge);
    this.now.set(Date.now());
    this.myCharges.remember(charge);
    if (!ChargePhases.isLive(charge)) {
      this.stopFollowing();
    }
  }

  private stopFollowing(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static wordsFor(problem: ApiProblem): string {
    return problem.status === 404
      ? 'This charge could not be found. The link may be incomplete.'
      : problem.detail;
  }
}
