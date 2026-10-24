/** GET /v1/roles: a role and its permissions. System roles have a key and cannot be changed. */
export interface Role {
  id: string;
  key: string | null;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  member_count: number;
  /** Sent back as If-Match when changing a custom role (module 14). */
  version: number;
  created_at: string;
  updated_at: string;
}

/** A role to give someone, for the whole tenant (no site_ids) or chosen sites. */
export interface RoleAssignment {
  role_id: string;
  site_ids?: string[];
}

/** GET /v1/permissions: one permission key, labelled and grouped by module for the matrix. */
export interface Permission {
  key: string;
  area: string;
  label: string;
  is_read_only: boolean;
  module: string;
  module_name: string;
  /** True when the tenant's plan leaves the module out: the permission does nothing until it is added. */
  is_locked: boolean;
}

/** Body of POST /v1/roles and PATCH /v1/roles/{id}: a custom role (module 14). */
export interface RoleInput {
  name: string;
  description: string;
  permissions: string[];
}
