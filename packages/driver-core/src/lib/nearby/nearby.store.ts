import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../api/api-problem';
import { DriverChargesApiService } from '../api/driver-charges-api.service';
import { NearbyPlace } from '../api/models/nearby-place';
import { DevicePosition, PositionSource } from './position-source';

/** What the Nearby section shows: the sites, a button to allow location, or why there are none. */
export type NearbyState = 'loading' | 'ask' | 'ready' | 'denied' | 'unavailable' | 'error';

/**
 * The Nearby list on Home (module 35, shared with the driver web app in module 37). The
 * device is asked for its location only when the driver taps "Use my location"; once
 * allowed, each visit to Home looks again.
 */
@Injectable({ providedIn: 'root' })
export class NearbyStore {
  static readonly NO_FIX = 'Your device could not tell where you are. Try again in a moment.';

  private readonly api = inject(DriverChargesApiService);
  private readonly location = inject(PositionSource);

  readonly places = signal<NearbyPlace[]>([]);
  readonly state = signal<NearbyState>('loading');
  readonly error = signal('');

  async load(isAsking = false): Promise<void> {
    this.error.set('');
    if (!this.places().length) {
      this.state.set('loading');
    }
    const position = await this.position(isAsking);
    if (!position) {
      return;
    }
    try {
      const answer = await firstValueFrom(this.api.nearby(position.latitude, position.longitude));
      this.places.set(answer.items);
      this.state.set('ready');
    } catch (error) {
      this.fail(ApiProblem.from(error).detail);
    }
  }

  clear(): void {
    this.places.set([]);
    this.state.set('loading');
  }

  /** The device's position, or null with the state that says why there is none. */
  private async position(isAsking: boolean): Promise<DevicePosition | null> {
    try {
      const position = await this.location.position(isAsking);
      if (!position) {
        const permission = await this.location.permission();
        this.state.set(permission === 'granted' || permission === 'prompt' ? 'ask' : permission);
      }
      return position;
    } catch {
      this.fail(NearbyStore.NO_FIX);
      return null;
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('error');
  }
}
