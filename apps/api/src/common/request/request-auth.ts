import { HttpStatus } from '@nestjs/common';
import { StaffAccount } from '../account/staff-account';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';
import { RequestOrigin } from './request-origin';

/**
 * What the guards learned about the caller, attached to the request:
 *   user     from the access token (AuthenticationGuard)
 *   account  the person's row in user_accounts (TenantContextGuard)
 *   access   their membership, roles and permissions in the chosen tenant (TenantContextGuard)
 * `access` is null only on routes marked RouteAccess.withoutTenant().
 */
export class RequestAuth {
  constructor(
    readonly user: AuthenticatedUser,
    readonly origin: RequestOrigin,
    readonly account: StaffAccount | null = null,
    readonly access: TenantAccess | null = null,
  ) {}

  withAccount(account: StaffAccount | null): RequestAuth {
    return new RequestAuth(this.user, this.origin, account, this.access);
  }

  withAccess(access: TenantAccess): RequestAuth {
    return new RequestAuth(this.user, this.origin, this.account, access);
  }

  /** The caller's account. Callers whose e-mail Keycloak has not verified have none yet. */
  requireAccount(): StaffAccount {
    if (!this.account) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'account_unverified',
        'Verify your e-mail address first.',
      );
    }
    return this.account;
  }

  /** The tenant access. TenantContextGuard guarantees it on every route not marked withoutTenant(). */
  requireAccess(): TenantAccess {
    if (!this.access) {
      throw new ProblemException(HttpStatus.BAD_REQUEST, 'tenant_required', 'Choose a tenant.');
    }
    return this.access;
  }
}
