import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { MobileAuthService } from './mobile-auth.service';

/** Opens the tabs for a signed-in driver; anyone else starts on the welcome page. */
@Injectable({ providedIn: 'root' })
export class SignedInGuard implements CanActivate {
  private readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    return this.auth.hasSession() || this.router.parseUrl('/welcome');
  }
}
