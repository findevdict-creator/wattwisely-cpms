import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountStore } from '../account/account.store';
import { ChargingNowStore } from '../charging/charging-now.store';
import { HistoryStore } from '../history/history.store';
import { NearbyStore } from '../nearby/nearby.store';
import { PushRegistrar } from '../notifications/push-registrar';
import { MobileAuthService } from './mobile-auth.service';

/**
 * Signs the driver out of the app and forgets what it showed of them, so the next one to
 * sign in on this phone sees none of it; after a deleted account, Keycloak's own page
 * deletes the login (module 33). The phone stops receiving the driver's pushes first, while
 * the API still knows who asks (module 34). A sign-in Keycloak ended ends here the same way.
 */
@Injectable({ providedIn: 'root' })
export class SignOut {
  private readonly auth = inject(MobileAuthService);
  private readonly account = inject(AccountStore);
  private readonly chargingNow = inject(ChargingNowStore);
  private readonly history = inject(HistoryStore);
  private readonly nearby = inject(NearbyStore);
  private readonly pushes = inject(PushRegistrar);
  private readonly router = inject(Router);

  async run(isAccountDeleted = false): Promise<void> {
    await this.pushes.forget(isAccountDeleted);
    if (isAccountDeleted) {
      this.auth.deleteLogin();
    } else {
      this.auth.logout();
    }
    await this.leave();
  }

  /**
   * Runs once at start-up: when Keycloak ends the sign-in (a refused refresh token), the
   * driver leaves the page they were on for the welcome page, as after signing out.
   */
  listen(): void {
    this.auth.sessionEnded.subscribe(() => void this.afterSessionEnded());
  }

  private async afterSessionEnded(): Promise<void> {
    await this.pushes.forget(false);
    if (this.router.navigated) {
      await this.leave();
    }
  }

  private async leave(): Promise<void> {
    this.account.clear();
    this.chargingNow.clear();
    this.history.clear();
    this.nearby.clear();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
