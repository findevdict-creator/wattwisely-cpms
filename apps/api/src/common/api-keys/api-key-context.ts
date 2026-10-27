import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception';
import { RequestAuth } from '../request/request-auth';
import { ApiKeyErrors } from './api-key-errors';

/** Which kind of route a request with an API key is trying to reach. */
export interface RouteKind {
  isWithoutTenant: boolean;
  isPlatform: boolean;
}

/**
 * What TenantContextGuard does for a request that carries an API key instead of a login
 * (module 16): the key's tenant is the tenant, so the X-Tenant-Id header may only agree with
 * it, and routes that are about a person (their own account, the admin console) are refused.
 */
export class ApiKeyContext {
  static check(auth: RequestAuth, route: RouteKind, header: string | string[] | undefined): void {
    if (route.isWithoutTenant || route.isPlatform) {
      throw ApiKeyErrors.notAllowed();
    }
    const requested = Array.isArray(header) ? header[0] : header;
    if (requested && requested !== auth.requireAccess().tenant.id) {
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'tenant_not_found',
        'This tenant does not exist.',
      );
    }
  }
}
