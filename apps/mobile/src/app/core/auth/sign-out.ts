import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountStore } from '../account/account.store';
import { ChargingNowStore } from '../charging/charging-now.store';
import { HistoryStore } from '../history/history.store';
import { MobileAuthService } from './mobile-auth.service';

/**
 * Signs the driver out of the app and forgets what it showed of them, so the next one to
 * sign in on this phone sees none of it; after a deleted account, Keycloak's own page
 * deletes the login (module 33).
 */
@Injectable({ providedIn: 'root' })
export class SignOut {
  private readonly auth = inject(MobileAuthService);
  private readonly account = inject(AccountStore);
  private readonly chargingNow = inject(ChargingNowStore);
  private readonly history = inject(HistoryStore);
  private readonly router = inject(Router);

  async run(isAccountDeleted = false): Promise<void> {
    if (isAccountDeleted) {
      this.auth.deleteLogin();
    } else {
      this.auth.logout();
    }
    this.account.clear();
    this.chargingNow.clear();
    this.history.clear();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
