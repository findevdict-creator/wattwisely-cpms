import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiProblem,
  DriverChargeDetail,
  DriverChargesApiService,
  DriverPlaceAccess,
} from '@wattwisely/driver-core';
import { DriverAuthService } from '../../core/auth/driver-auth.service';

/**
 * The plug as the logged-in driver sees it (module 19): who pays here and whether they may
 * charge, and the start that needs no card form, with the saved card or for free.
 */
@Injectable()
export class AccountStartStore {
  private readonly api = inject(DriverChargesApiService);
  private readonly auth = inject(DriverAuthService);

  readonly access = signal<DriverPlaceAccess | null>(null);
  readonly isStarting = signal(false);
  readonly error = signal('');

  /** Nothing to load without a login; a failure leaves the anonymous page as it is. */
  async load(identity: string, connector: string): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    try {
      this.access.set((await firstValueFrom(this.api.place(identity, connector))).access);
    } catch {
      this.access.set(null);
    }
  }

  async start(
    identity: string,
    ocppConnectorId: number,
    isConsentGiven: boolean,
  ): Promise<DriverChargeDetail | null> {
    this.isStarting.set(true);
    this.error.set('');
    try {
      return await firstValueFrom(this.api.start(identity, ocppConnectorId, isConsentGiven));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      return null;
    } finally {
      this.isStarting.set(false);
    }
  }
}
