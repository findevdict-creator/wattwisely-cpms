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

/** The plan the tenant is on, as far as the portal needs it. */
export interface MyPlan {
  code: string;
  name: string;
}

/** The managed service agreement, as far as every member needs to know (module 10). */
export interface ManagedServiceSummary {
  status: 'pending_acceptance' | 'active' | 'ending';
  /** True for Wattwisely staff working in the tenant as its Managed operator. */
  is_operator: boolean;
  /** Tariff changes by the Managed operator wait for the Owner's approval. */
  is_tariff_approval_required: boolean;
  account_manager_name: string | null;
  ends_at: string | null;
}

/** GET /v1/me/permissions: what I may do in the current tenant, and what the plan leaves locked. */
export interface MyPermissions {
  tenant_id: string;
  is_read_only: boolean;
  plan: MyPlan | null;
  /** Modules the tenant's plan does not include; their pages say so instead of failing. */
  locked_modules: string[];
  roles: HeldRole[];
  permissions: GrantedPermission[];
  /** Null when Wattwisely does not run the tenant's charging. */
  managed_service: ManagedServiceSummary | null;
}
