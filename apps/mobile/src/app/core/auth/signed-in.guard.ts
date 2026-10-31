import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { MobileAuthService } from './mobile-auth.service';

/**
 * Opens the tabs for a signed-in driver; anyone else starts on the welcome page, which comes
 * back to the page they asked for (a plug's QR code, an invitation) once they have signed in.
 */
@Injectable({ providedIn: 'root' })
export class SignedInGuard implements CanActivate {
  private readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.auth.hasSession()) {
      return true;
    }
    const isTab = state.url.startsWith('/tabs');
    return this.router.createUrlTree(['/welcome'], {
      queryParams: isTab ? {} : { next: state.url },
    });
  }
}
