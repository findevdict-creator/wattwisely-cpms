import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { PermissionsService } from './permissions.service';

/**
 * Opens a page only for people holding the permission in its route data,
 * e.g. `data: { permission: 'team:read' }`. Anyone else lands on the home page.
 */
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    await this.permissions.ensureLoaded();
    return this.permissions.can(route.data['permission']) || this.router.parseUrl('/');
  }
}
