import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { MobileAuthService } from './mobile-auth.service';

/** Shows the welcome page only while nobody is signed in; a signed-in driver goes home. */
@Injectable({ providedIn: 'root' })
export class SignedOutGuard implements CanActivate {
  private readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    return !this.auth.hasSession() || this.router.parseUrl('/tabs/home');
  }
}
