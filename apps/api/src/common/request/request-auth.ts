import { HttpStatus } from '@nestjs/common';
import { StaffAccount } from '../account/staff-account';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PlatformAccess } from '../platform/platform-access';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';
import { RequestOrigin } from './request-origin';

/**
 * What the guards learned about the caller, attached to the request:
 *   user     from the access token (AuthenticationGuard)
 *   account  the person's row in user_accounts (TenantContextGuard)
 *   access   their membership, roles and permissions in the chosen tenant (TenantContextGuard)
 *   platform their Wattwisely staff role, on admin console routes only (TenantContextGuard)
 * `access` is null on routes marked RouteAccess.withoutTenant() or RouteAccess.platform().
 */
export class RequestAuth {
  readonly account: StaffAccount | null;
  readonly access: TenantAccess | null;
  readonly platform: PlatformAccess | null;

  constructor(
    readonly user: AuthenticatedUser,
    readonly origin: RequestOrigin,
    resolved: ResolvedAuth = {},
  ) {
    this.account = resolved.account ?? null;
    this.access = resolved.access ?? null;
    this.platform = resolved.platform ?? null;
  }

  withAccount(account: StaffAccount | null): RequestAuth {
    return new RequestAuth(this.user, this.origin, { ...this.resolved(), account });
  }

  withAccess(access: TenantAccess): RequestAuth {
    return new RequestAuth(this.user, this.origin, { ...this.resolved(), access });
  }

  withPlatform(platform: PlatformAccess): RequestAuth {
    return new RequestAuth(this.user, this.origin, { ...this.resolved(), platform });
  }

  /** The staff role. TenantContextGuard guarantees it on every route marked RouteAccess.platform(). */
  requirePlatform(): PlatformAccess {
    if (!this.platform) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'not_platform_staff',
        'Only Wattwisely staff can use the admin console.',
      );
    }
    return this.platform;
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

  private resolved(): ResolvedAuth {
    return { account: this.account, access: this.access, platform: this.platform };
  }
}

/** What the guards resolve from the database, step by step. */
export interface ResolvedAuth {
  account?: StaffAccount | null;
  access?: TenantAccess | null;
  platform?: PlatformAccess | null;
}
