/** A pending invitation found by its link or by its invitee, with the tenant it is for. */
export interface InvitationRecord {
  membershipId: string;
  userAccountId: string;
  email: string;
  /** True when the invited address has logged in before: the person has a Keycloak account. */
  hasLogin: boolean;
  status: 'invited' | 'active' | 'removed';
  expiresAt: Date | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
}
