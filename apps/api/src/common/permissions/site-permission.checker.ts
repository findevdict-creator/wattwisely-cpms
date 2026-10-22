import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';
import { PermissionKey } from './permission-catalog';
import { SiteScope } from './site-scope';

/**
 * Checks site-scoped permissions on one row, after PermissionGuard has checked that the
 * caller holds the permission somewhere. A Technician on Riverside may command chargers
 * there, but not at Depot North.
 */
export class SitePermissionChecker {
  /** The scope of a permission; an empty scope when the caller does not hold it. */
  static scopeOf(access: TenantAccess, key: PermissionKey): SiteScope {
    return access.permissions.scopeFor(key) ?? SiteScope.sites([]);
  }

  /** Can the caller use the permission at this site? */
  static isAllowedAt(access: TenantAccess, key: PermissionKey, siteId: string): boolean {
    return SitePermissionChecker.scopeOf(access, key).allows(siteId);
  }

  static requireAt(access: TenantAccess, key: PermissionKey, siteId: string): void {
    if (!SitePermissionChecker.isAllowedAt(access, key, siteId)) {
      throw SitePermissionChecker.denied(`You need the ${key} permission at this site.`);
    }
  }

  /** For changes that reach beyond single sites, such as creating a new site. */
  static requireWholeTenant(access: TenantAccess, key: PermissionKey): void {
    if (!SitePermissionChecker.scopeOf(access, key).isWholeTenant) {
      throw SitePermissionChecker.denied(
        `You need the ${key} permission for the whole company to do this.`,
      );
    }
  }

  private static denied(detail: string): ProblemException {
    return new ProblemException(HttpStatus.FORBIDDEN, 'permission_denied', detail);
  }
}
