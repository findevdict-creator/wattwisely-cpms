/** A tenant on trial or active can be used; a suspended one is read-only. */
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

/** One tenant the user belongs to, as returned by the API. */
export interface TenantMembership {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
}
