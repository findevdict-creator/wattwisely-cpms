import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { PermissionsService } from './permissions.service';

/**
 * Opens a page only for people holding the permission in its route data,
 * e.g. `data: { permission: 'team:read' }`, or any one of a list of permissions.
 * Anyone else lands on the home page.
 */
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    await this.permissions.ensureLoaded();
    const keys: string[] = ([] as string[]).concat(route.data['permission']);
    return keys.some((key) => this.permissions.can(key)) || this.router.parseUrl('/');
  }
}
