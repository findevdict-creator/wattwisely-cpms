import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RouteAccess } from '../auth/route-access.decorator';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { TenantAccess } from '../tenant/tenant-access';
import { PermissionCatalog } from './permission-catalog';

/**
 * Step 3 of every request: may the caller do this?
 * The route names a permission with RouteAccess.requires(); the caller's roles in the
 * current tenant must hold it (anywhere: services narrow site-scoped permissions to rows).
 * Suspended tenants keep read-only permissions only.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private readonly routeAccess: RouteAccessReader) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.routeAccess.isPublic(context) || this.routeAccess.isWithoutTenant(context)) {
      return true;
    }
    const permission = this.routeAccess.requiredPermission(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const access = request.auth?.requireAccess() as TenantAccess;
    if (permission === RouteAccess.ANY_MEMBER) {
      return true;
    }
    const definition = permission ? PermissionCatalog.find(permission) : undefined;
    if (!definition) {
      this.logger.error(`${request.method} ${request.url} declares no known permission`);
      throw PermissionGuard.denied('This action is not available.');
    }
    if (!access.permissions.can(definition.key)) {
      throw PermissionGuard.denied(`You need the ${definition.key} permission for this.`);
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
}
