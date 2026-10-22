import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { TenantMembershipResolver } from './tenant-membership.resolver';

/**
 * Step 2 of every request: which tenant is the caller working in?
 * The tenant comes from the caller's own memberships in the token, never from the URL.
 * Routes without a tenant are refused unless marked RouteAccess.withoutTenant().
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly membershipResolver: TenantMembershipResolver,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.routeAccess.isPublic(context) || this.routeAccess.isWithoutTenant(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new ProblemException(HttpStatus.UNAUTHORIZED, 'token_missing', 'Log in first.');
    }
    const tenant = this.membershipResolver.resolve(
      request.auth.user,
      request.headers[TenantMembershipResolver.HEADER],
    );
    request.auth = request.auth.withTenant(tenant);
    return true;
  }
}
