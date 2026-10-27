import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { StaffAccountResolver } from '../account/staff-account.resolver';
import { ApiKeyContext } from '../api-keys/api-key-context';
import { RouteAccessReader } from '../auth/route-access.reader';
import { PlatformAccessResolver } from '../platform/platform-access.resolver';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { TenantAccessResolver } from './tenant-access.resolver';

/**
 * Step 2 of every request: who is this in our database, and which tenant are they working in?
 * The tenant must be one of the caller's active memberships, read from the database on
 * every request (cached briefly), never from the URL. Routes marked
 * RouteAccess.withoutTenant() get the account only; routes marked RouteAccess.platform()
 * get the caller's Wattwisely staff role instead of a tenant (module 9). A request with an
 * API key (module 16) already carries its tenant: the route only has to be one a key may use.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly accountResolver: StaffAccountResolver,
    private readonly accessResolver: TenantAccessResolver,
    private readonly platformResolver: PlatformAccessResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.routeAccess.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new ProblemException(HttpStatus.UNAUTHORIZED, 'token_missing', 'Log in first.');
    }
    if (request.auth.apiKey) {
      ApiKeyContext.check(request.auth, this.routeKind(context), this.tenantHeader(request));
      return true;
    }
    const account = await this.accountResolver.resolve(request.auth.requireUser());
    request.auth = request.auth.withAccount(account);
    if (this.routeAccess.isWithoutTenant(context)) {
      return true;
    }
    if (this.routeAccess.requiredPlatformPermission(context)) {
      const platform = await this.platformResolver.resolve(request.auth.requireAccount());
      request.auth = request.auth.withPlatform(PlatformAccessResolver.require(platform));
      return true;
    }
    const access = await this.accessResolver.resolve(
      request.auth.requireAccount(),
      this.tenantHeader(request),
    );
    request.auth = request.auth.withAccess(access);
    return true;
  }

  private tenantHeader(request: AuthenticatedRequest): string | string[] | undefined {
    return request.headers[TenantAccessResolver.HEADER];
  }

  private routeKind(context: ExecutionContext) {
    return {
      isWithoutTenant: this.routeAccess.isWithoutTenant(context),
      isPlatform: this.routeAccess.requiredPlatformPermission(context) !== undefined,
    };
  }
}
