/** One role a member holds, as stored in membership_roles. */
export interface MemberGrant {
  roleId: string;
  roleKey: string | null;
  roleName: string;
  siteId: string | null;
}

/** The person's roles, read for the team page and the audit log. */
export class MemberGrants {
  static readonly MANAGED_OPERATOR_KEY = 'managed-operator';

  /** True for Wattwisely staff working in the tenant under a managed service agreement (module 10). */
  static isManagedOperator(grants: MemberGrant[]): boolean {
    return grants.some((grant) => grant.roleKey === MemberGrants.MANAGED_OPERATOR_KEY);
  }
}

/** A tenant membership with the person and their roles, as MembersRepository returns it. */
export interface MemberRecord {
  id: string;
  userAccountId: string;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'removed';
  invitedAt: Date | null;
  inviteExpiresAt: Date | null;
  joinedAt: Date | null;
  removedAt: Date | null;
  invitedByName: string | null;
  grants: MemberGrant[];
}
