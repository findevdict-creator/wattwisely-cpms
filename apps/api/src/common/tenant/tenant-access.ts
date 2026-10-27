import { TenantEntitlements } from '../entitlements/tenant-entitlements';
import { PermissionSet, RoleGrant } from '../permissions/permission-set';
import { TenantSummary } from './tenant-summary';

/**
 * A person's access to one tenant: their membership, roles and the permissions those give,
 * and the tenant's plan, which decides which modules those permissions can reach (module 9).
 */
export class TenantAccess {
  readonly permissions: PermissionSet;

  constructor(
    readonly membershipId: string,
    readonly tenant: TenantSummary,
    readonly grants: readonly RoleGrant[],
    readonly entitlements: TenantEntitlements,
  ) {
    this.permissions = PermissionSet.fromGrants(grants);
  }
}
