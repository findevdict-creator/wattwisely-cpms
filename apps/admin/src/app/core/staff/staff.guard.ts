import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { StaffContextService } from './staff-context.service';

/**
 * Lets a page open only for Wattwisely staff, and only when their role holds the
 * permission the route names in `data.permission` (if any). Others see the "not staff" page.
 */
@Injectable({ providedIn: 'root' })
export class StaffGuard implements CanActivate {
  private readonly staff = inject(StaffContextService);
  private readonly router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    await this.staff.ensureLoaded();
    if (!this.staff.isStaff()) {
      return this.router.createUrlTree(['/not-staff']);
    }
    const permission = route.data['permission'] as string | undefined;
    return !permission || this.staff.can(permission) ? true : this.router.createUrlTree(['/']);
  }
}
