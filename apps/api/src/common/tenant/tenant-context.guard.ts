import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { StaffAccountResolver } from '../account/staff-account.resolver';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { TenantAccessResolver } from './tenant-access.resolver';

/**
 * Step 2 of every request: who is this in our database, and which tenant are they working in?
 * The tenant must be one of the caller's active memberships, read from the database on
 * every request (cached briefly), never from the URL. Routes marked
 * RouteAccess.withoutTenant() get the account only.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly accountResolver: StaffAccountResolver,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.routeAccess.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new ProblemException(HttpStatus.UNAUTHORIZED, 'token_missing', 'Log in first.');
    }
    const account = await this.accountResolver.resolve(request.auth.user);
    request.auth = request.auth.withAccount(account);
    if (this.routeAccess.isWithoutTenant(context)) {
      return true;
    }
    const access = await this.accessResolver.resolve(
      request.auth.requireAccount(),
      request.headers[TenantAccessResolver.HEADER],
    );
    request.auth = request.auth.withAccess(access);
    return true;
  }
}
