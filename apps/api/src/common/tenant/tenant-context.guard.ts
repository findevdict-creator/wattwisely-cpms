import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { DriverAccountResolver } from '../account/driver-account.resolver';
import { ApiKeyContext } from '../api-keys/api-key-context';
import { RouteAccessReader } from '../auth/route-access.reader';
import { ProblemException } from '../problem/problem.exception';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { RequestAuth } from '../request/request-auth';
import { StaffContextResolver } from './staff-context.resolver';

/**
 * Step 2 of every request: who is this in our database, and which tenant are they working in?
 * Three kinds of caller never mix: a request with an API key (module 16) already carries its
 * tenant, so the route only has to be one a key may use; a driver's token (module 19) opens the
 * routes marked RouteAccess.driver() and nothing else, and those routes accept no other token;
 * everyone else is staff, whose account, tenant or platform role StaffContextResolver finds.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly driverResolver: DriverAccountResolver,
    private readonly staff: StaffContextResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.routeAccess.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new ProblemException(HttpStatus.UNAUTHORIZED, 'token_missing', 'Log in first.');
    }
    if (this.routeAccess.isDriver(context)) {
      request.auth = await this.resolveDriver(request.auth);
      return true;
    }
    if (request.auth.apiKey) {
      ApiKeyContext.check(request.auth, this.routeKind(context), this.staff.tenantHeader(request));
      return true;
    }
    if (request.auth.requireUser().isDriver) {
      throw TenantContextGuard.wrongApp('driver_token_not_allowed', 'the driver app');
    }
    request.auth = await this.staff.resolve(context, request);
    return true;
  }

  /** A /v1/driver route: the token must be the driver app's, and names the driver's own account. */
  private async resolveDriver(auth: RequestAuth): Promise<RequestAuth> {
    if (auth.apiKey || !auth.user?.isDriver) {
      throw TenantContextGuard.wrongApp('staff_token_not_allowed', 'the portal');
    }
    return auth.withDriver(await this.driverResolver.resolve(auth.user));
  }

  private static wrongApp(code: string, app: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      code,
      `A login from ${app} cannot be used here.`,
    );
  }

  private routeKind(context: ExecutionContext) {
    return {
      isWithoutTenant: this.routeAccess.isWithoutTenant(context),
      isPlatform: this.routeAccess.requiredPlatformPermission(context) !== undefined,
    };
  }
}
