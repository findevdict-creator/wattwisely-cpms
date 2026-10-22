import { AuthenticatedUser } from '../auth/authenticated-user';
import { TenantMembership } from '../tenant/tenant-membership';

/**
 * What the guards learned about the caller, attached to the request.
 * `tenant` is null only on routes marked RouteAccess.withoutTenant().
 */
export class RequestAuth {
  constructor(
    readonly user: AuthenticatedUser,
    readonly tenant: TenantMembership | null = null,
  ) {}

  withTenant(tenant: TenantMembership): RequestAuth {
    return new RequestAuth(this.user, tenant);
  }
}
