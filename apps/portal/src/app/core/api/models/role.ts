/** GET /v1/roles: a role and its permissions. System roles have a key and cannot be changed. */
export interface Role {
  id: string;
  key: string | null;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  member_count: number;
}

/** A role to give someone, for the whole tenant (no site_ids) or chosen sites. */
export interface RoleAssignment {
  role_id: string;
  site_ids?: string[];
}
