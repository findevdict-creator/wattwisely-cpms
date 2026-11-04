import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { StaffAccountResolver } from '../account/staff-account.resolver';
import { RouteAccessReader } from '../auth/route-access.reader';
import { PlatformAccessResolver } from '../platform/platform-access.resolver';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { RequestAuth } from '../request/request-auth';
import { TenantAccessResolver } from './tenant-access.resolver';

/**
 * The staff side of TenantContextGuard: the person's account, then what the route asks for.
 * Routes marked RouteAccess.withoutTenant() get the account only; routes marked
 * RouteAccess.platform() get the caller's Wattwisely staff role (module 9), and only with a
 * token the admin console's own Keycloak client issued; every other route
 * gets the caller's access in the tenant named by the X-Tenant-Id header, which must be one of
 * their active memberships, read from the database (cached briefly), never from the URL.
 */
@Injectable()
export class StaffContextResolver {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly accountResolver: StaffAccountResolver,
    private readonly accessResolver: TenantAccessResolver,
    private readonly platformResolver: PlatformAccessResolver,
  ) {}

  async resolve(context: ExecutionContext, request: AuthenticatedRequest): Promise<RequestAuth> {
    const auth = request.auth as RequestAuth;
    const withAccount = auth.withAccount(await this.accountResolver.resolve(auth.requireUser()));
    if (this.routeAccess.isWithoutTenant(context)) {
      return withAccount;
    }
    const account = withAccount.requireAccount();
    if (this.routeAccess.requiredPlatformPermission(context)) {
      StaffContextResolver.requireAdminConsoleLogin(auth);
      const platform = await this.platformResolver.resolve(account);
      return withAccount.withPlatform(PlatformAccessResolver.require(platform));
    }
    const access = await this.accessResolver.resolve(account, this.tenantHeader(request));
    return withAccount.withAccess(access);
  }

  /** A portal login, even a staff member's, cannot be used in the admin console. */
  private static requireAdminConsoleLogin(auth: RequestAuth): void {
    if (!auth.requireUser().isFromAdminConsole) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'portal_token_not_allowed',
        'Log in to the admin console to use it; a login from the portal cannot be used here.',
      );
    }
  }

  tenantHeader(request: AuthenticatedRequest): string | string[] | undefined {
    return request.headers[TenantAccessResolver.HEADER];
  }
}
