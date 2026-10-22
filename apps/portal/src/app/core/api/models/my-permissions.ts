/** A role I hold, for the whole tenant (site_id null) or one site. */
export interface HeldRole {
  role_id: string;
  key: string | null;
  name: string;
  site_id: string | null;
}

/** A permission I hold; site_ids is null when it covers the whole tenant. */
export interface GrantedPermission {
  key: string;
  site_ids: string[] | null;
}

/** GET /v1/me/permissions: what I may do in the current tenant. */
export interface MyPermissions {
  tenant_id: string;
  is_read_only: boolean;
  roles: HeldRole[];
  permissions: GrantedPermission[];
}
