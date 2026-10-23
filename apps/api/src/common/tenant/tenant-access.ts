import { TenantEntitlements } from '../entitlements/tenant-entitlements';
import { ManagedOperatorRole } from '../managed/managed-operator-role';
import { PermissionSet, RoleGrant } from '../permissions/permission-set';
import { TenantSummary } from './tenant-summary';

/**
 * A person's access to one tenant: their membership, roles and the permissions those give,
 * and the tenant's plan, which decides which modules those permissions can reach (module 9).
 * Wattwisely staff working in a managed tenant hold the Managed operator role (module 10):
 * the audit log labels what they do, and the tariff approval rule applies to them.
 */
export class TenantAccess {
  readonly permissions: PermissionSet;
  readonly isManagedOperator: boolean;

  constructor(
    readonly membershipId: string,
    readonly tenant: TenantSummary,
    readonly grants: readonly RoleGrant[],
    readonly entitlements: TenantEntitlements,
  ) {
    this.permissions = PermissionSet.fromGrants(grants);
    this.isManagedOperator = grants.some((grant) => grant.roleKey === ManagedOperatorRole.KEY);
  }
}
