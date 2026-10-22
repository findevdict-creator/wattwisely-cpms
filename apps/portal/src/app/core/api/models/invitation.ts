import { TenantMembership } from './tenant-membership';

/** GET /v1/invitations/{token}: what the invitation page shows before anyone logs in. */
export interface InvitationPreview {
  tenant_name: string;
  email: string;
  roles: string[];
  invited_by: string | null;
  expires_at: string;
  is_expired: boolean;
}

/** Answer to accepting an invitation. */
export interface AcceptedInvitation {
  tenant: TenantMembership;
}
