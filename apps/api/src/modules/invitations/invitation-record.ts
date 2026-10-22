/** A pending invitation found by its link, with the tenant it is for. */
export interface InvitationRecord {
  membershipId: string;
  userAccountId: string;
  email: string;
  status: 'invited' | 'active' | 'removed';
  expiresAt: Date | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
}
