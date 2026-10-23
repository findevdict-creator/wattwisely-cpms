import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RouteAccess } from '../auth/route-access.decorator';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { RequestAuth } from '../request/request-auth';
import { TenantAccess } from '../tenant/tenant-access';
import { ModuleCatalog } from './module-catalog';
import { PermissionCatalog, PermissionDefinition } from './permission-catalog';

/**
 * Step 3 of every request: may the caller do this?
 * The route names a permission with RouteAccess.requires(); the caller's roles in the
 * current tenant must hold it (anywhere: services narrow site-scoped permissions to rows),
 * and the tenant's plan must include the permission's module (module 9).
 * Suspended tenants keep read-only permissions only. Admin console routes name a platform
 * permission with RouteAccess.platform(); the caller's staff role must hold it.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private readonly routeAccess: RouteAccessReader) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.routeAccess.isPublic(context) || this.routeAccess.isWithoutTenant(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = request.auth as RequestAuth;
    const platformPermission = this.routeAccess.requiredPlatformPermission(context);
    if (platformPermission) {
      return PermissionGuard.checkPlatform(auth, platformPermission);
    }
    const permission = this.routeAccess.requiredPermission(context);
    if (permission === RouteAccess.ANY_MEMBER) {
      return true;
    }
    const definition = permission ? PermissionCatalog.find(permission) : undefined;
    if (!definition) {
      this.logger.error(`${request.method} ${request.url} declares no known permission`);
      throw PermissionGuard.denied('This action is not available.');
    }
    return PermissionGuard.checkTenant(auth.requireAccess(), definition);
  }

  private static checkPlatform(auth: RequestAuth, permission: string): boolean {
    if (!auth.requirePlatform().can(permission)) {
      throw PermissionGuard.denied(`Your Wattwisely role does not allow this (${permission}).`);
    }
    return true;
  }

  private static checkTenant(access: TenantAccess, definition: PermissionDefinition): boolean {
    if (!access.permissions.can(definition.key)) {
      throw PermissionGuard.denied(`You need the ${definition.key} permission for this.`);
    }
    if (access.entitlements.isPermissionLocked(definition.key)) {
      throw PermissionGuard.locked(definition.key);
    }
    if (access.tenant.isSuspended && !definition.isReadOnly) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'tenant_suspended',
        'This account is suspended, so changes are not possible.',
      );
    }
    return true;
  }

  private static denied(detail: string): ProblemException {
    return new ProblemException(HttpStatus.FORBIDDEN, 'permission_denied', detail);
  }

  /** The module exists, the role allows it, but the tenant's plan does not include it. */
  private static locked(permissionKey: string): ProblemException {
    const module = ModuleCatalog.moduleOf(permissionKey);
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'module_not_in_plan',
      `${module?.name ?? 'This module'} is not part of your plan. Ask Wattwisely to add it.`,
    );
  }
}
