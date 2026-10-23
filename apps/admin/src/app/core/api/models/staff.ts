/** One Wattwisely staff member (GET /v1/admin/staff). */
export interface StaffMember {
  id: string;
  user_account_id: string;
  email: string;
  name: string;
  role: 'admin' | 'billing' | 'support' | 'viewer';
  granted_at: string;
  removed_at: string | null;
  version: number;
}

/** One console role and what it allows (GET /v1/admin/staff/roles). */
export interface PlatformRoleDefinition {
  key: string;
  name: string;
  description: string;
  permission_keys: string[];
}
