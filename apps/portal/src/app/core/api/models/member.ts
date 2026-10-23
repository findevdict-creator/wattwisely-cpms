/** Invited people have not accepted yet; removed people keep their history but have no access. */
export type MemberStatus = 'invited' | 'active' | 'removed';

/** A role a member holds; site_ids is null when it covers the whole tenant. */
export interface MemberRole {
  role_id: string;
  key: string | null;
  name: string;
  site_ids: string[] | null;
}

/** GET /v1/members: one person in the team. */
export interface Member {
  id: string;
  user_account_id: string;
  email: string;
  name: string;
  status: MemberStatus;
  roles: MemberRole[];
  invited_by: string | null;
  invited_at: string | null;
  invite_expires_at: string | null;
  is_invite_expired: boolean;
  joined_at: string | null;
  removed_at: string | null;
  /** Wattwisely staff working in the company under the managed service; not editable here. */
  is_managed_operator: boolean;
}

/** Answer to sending or resending an invitation. */
export interface InviteResult {
  member: Member;
  is_email_sent: boolean;
}
