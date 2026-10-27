import { HttpStatus } from '@nestjs/common';
import { DriverAccount } from '../account/driver-account';
import { StaffAccount } from '../account/staff-account';
import { ApiKeyPrincipal } from '../api-keys/api-key-principal';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PlatformAccess } from '../platform/platform-access';
import { ProblemException } from '../problem/problem.exception';
import { TenantAccess } from '../tenant/tenant-access';
import { RequestOrigin } from './request-origin';

/**
 * What the guards learned about the caller, attached to the request:
 *   user     from the access token (AuthenticationGuard); null when an API key calls (module 16)
 *   apiKey   the API key behind the request, with the member it acts for (AuthenticationGuard)
 *   account  the person's row in user_accounts (TenantContextGuard), or the key's member
 *   access   their membership, roles and permissions in the chosen tenant (TenantContextGuard),
 *            or the key's tenant and chosen permissions
 *   platform their Wattwisely staff role, on admin console routes only (TenantContextGuard)
 *   driver   the driver's own account, on /v1/driver routes only (TenantContextGuard, module 19)
 * `access` is null on routes marked RouteAccess.withoutTenant(), RouteAccess.platform() or
 * RouteAccess.driver().
 */
export class RequestAuth {
  readonly account: StaffAccount | null;
  readonly access: TenantAccess | null;
  readonly platform: PlatformAccess | null;
  readonly apiKey: ApiKeyPrincipal | null;
  readonly driver: DriverAccount | null;

  constructor(
    readonly user: AuthenticatedUser | null,
    readonly origin: RequestOrigin,
    resolved: ResolvedAuth = {},
  ) {
    this.account = resolved.account ?? null;
    this.access = resolved.access ?? null;
    this.platform = resolved.platform ?? null;
    this.apiKey = resolved.apiKey ?? null;
    this.driver = resolved.driver ?? null;
  }

  /** A request made with an API key (module 16): the key's tenant and permissions are already set. */
  static forApiKey(
    principal: ApiKeyPrincipal,
    access: TenantAccess,
    origin: RequestOrigin,
  ): RequestAuth {
    return new RequestAuth(null, origin, { apiKey: principal, account: principal.account, access });
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

  withDriver(driver: DriverAccount): RequestAuth {
    return new RequestAuth(this.user, this.origin, { ...this.resolved(), driver });
  }

  /** The driver's account. TenantContextGuard guarantees it on every route marked RouteAccess.driver(). */
  requireDriver(): DriverAccount {
    if (!this.driver) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'driver_required',
        'Log in to the driver app for this.',
      );
    }
    return this.driver;
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

  /** The person behind the token. Routes an API key may use never need it; the guards keep keys off the rest. */
  requireUser(): AuthenticatedUser {
    if (!this.user) {
      throw new ProblemException(
        HttpStatus.FORBIDDEN,
        'api_key_not_allowed',
        'API keys can only use the company routes; log in as a person for this.',
      );
    }
    return this.user;
  }

  private resolved(): ResolvedAuth {
    return {
      account: this.account,
      access: this.access,
      platform: this.platform,
      apiKey: this.apiKey,
      driver: this.driver,
    };
  }
}

/** What the guards resolve from the database, step by step. */
export interface ResolvedAuth {
  account?: StaffAccount | null;
  access?: TenantAccess | null;
  platform?: PlatformAccess | null;
  apiKey?: ApiKeyPrincipal | null;
  driver?: DriverAccount | null;
}
