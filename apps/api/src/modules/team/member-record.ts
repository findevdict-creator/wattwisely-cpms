/** One role a member holds, as stored in membership_roles. */
export interface MemberGrant {
  roleId: string;
  roleKey: string | null;
  roleName: string;
  siteId: string | null;
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
