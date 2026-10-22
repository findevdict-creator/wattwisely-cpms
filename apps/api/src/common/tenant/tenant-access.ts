import { PermissionSet, RoleGrant } from '../permissions/permission-set';
import { TenantSummary } from './tenant-summary';

/** A person's access to one tenant: their membership, roles and the permissions those give. */
export class TenantAccess {
  readonly permissions: PermissionSet;

  constructor(
    readonly membershipId: string,
    readonly tenant: TenantSummary,
    readonly grants: readonly RoleGrant[],
  ) {
    this.permissions = PermissionSet.fromGrants(grants);
  }
}
