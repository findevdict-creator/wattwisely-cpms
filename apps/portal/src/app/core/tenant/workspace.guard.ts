import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { PermissionsService } from '../permissions/permissions.service';
import { TenantContextService } from './tenant-context.service';
import { UserLoaderService } from './user-loader.service';

/**
 * Runs after AuthGuard on every workspace page. Loads the user once, then makes sure a tenant is chosen:
 *   no tenant at all       -> "No workspace" page
 *   several, none chosen   -> tenant picker
 *   otherwise              -> loads the user's permissions in that tenant, then the page opens
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceGuard implements CanActivate {
  private readonly userLoader = inject(UserLoaderService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);

  async canActivate(): Promise<boolean | UrlTree> {
    await this.userLoader.ensureLoaded();
    if (this.tenantContext.tenants().length === 0) {
      return this.router.parseUrl('/no-workspace');
    }
    if (!this.tenantContext.currentTenantId()) {
      return this.router.parseUrl('/select-tenant');
    }
    await this.permissions.ensureLoaded();
    return true;
  }
}
