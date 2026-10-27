import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { DriverAuthService } from './driver-auth.service';

/** Opens the account pages for a logged-in driver; anyone else is sent to Keycloak and comes back here. */
@Injectable({ providedIn: 'root' })
export class AccountGuard implements CanActivate {
  private readonly authService = inject(DriverAuthService);

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }
    this.authService.login();
    return false;
  }
}
