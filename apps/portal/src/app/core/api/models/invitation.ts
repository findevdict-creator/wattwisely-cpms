import { TenantMembership } from './tenant-membership';

/** GET /v1/invitations/{token}: what the invitation page shows before anyone logs in. */
export interface InvitationPreview {
  tenant_name: string;
  email: string;
  /** True when the invited address has logged in before, so the page offers login, not sign-up. */
  has_login: boolean;
  roles: string[];
  invited_by: string | null;
  expires_at: string;
  is_expired: boolean;
}

/** One invitation waiting for me, in GET /v1/me; accepted with POST /v1/me/invitations/{id}/accept. */
export interface PendingInvitation {
  id: string;
  tenant_id: string;
  tenant_name: string;
  roles: string[];
  invited_by: string | null;
  expires_at: string;
}

/** Answer to accepting an invitation. */
export interface AcceptedInvitation {
  tenant: TenantMembership;
}
