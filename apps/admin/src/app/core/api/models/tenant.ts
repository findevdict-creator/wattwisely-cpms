import { Plan } from './plan';

/** How much of its plan a tenant uses. */
export interface PlanUsage {
  users: number;
  user_limit: number | null;
  connectors: number;
  connector_limit: number | null;
  ac_connectors: number;
  dc_connectors: number;
  sites: number;
  chargers: number;
  last_session_at: string | null;
}

/** One module as one tenant has it. */
export interface TenantModule {
  key: string;
  name: string;
  description: string;
  kind: 'core' | 'plan' | 'addon';
  is_enabled: boolean;
  source: 'core' | 'plan' | 'addon' | 'trial' | 'override' | null;
  ends_at: string | null;
  price: { amount: number; currency: string; pricing_unit: string } | null;
}

/** A tenant's plan, billing contact, usage and modules. */
export interface Subscription {
  plan: Plan | null;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | null;
  started_at: string | null;
  trial_ends_at: string | null;
  billing_email: string | null;
  billing_name: string | null;
  billing_reference: string | null;
  notes?: string;
  version: number | null;
  usage: PlanUsage;
  modules: TenantModule[];
}

/** A tenant's state. */
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

/** One row of the tenant list (GET /v1/admin/tenants). */
export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  region: string | null;
  plan: { id: string; code: string; name: string } | null;
  subscription_status: string | null;
  usage: PlanUsage;
  created_at: string;
  suspended_at: string | null;
  deleted_at: string | null;
}

/** One page of tenants. */
export interface TenantPage {
  items: TenantSummary[];
  next_cursor: string | null;
}

/** An Owner of a tenant. */
export interface TenantOwner {
  member_id: string;
  email: string;
  name: string;
  status: 'invited' | 'active';
  invited_at: string | null;
  joined_at: string | null;
}

/** One tenant in full (GET /v1/admin/tenants/{id}). */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  region: string | null;
  payment_mode: 'direct' | 'managed';
  plan: { id: string; code: string; name: string } | null;
  subscription: Subscription;
  owners: TenantOwner[];
  created_at: string;
  suspended_at: string | null;
  can_delete_from: string | null;
  deleted_at: string | null;
  version: number;
}

/** Body of POST /v1/admin/tenants. */
export interface CreateTenantRequest {
  name: string;
  slug?: string;
  region?: string;
  payment_mode?: 'direct' | 'managed';
  plan_id: string;
  subscription_status?: 'trialing' | 'active';
  trial_ends_at?: string;
  owner_email?: string;
  billing_email?: string;
  billing_name?: string;
}

/** Body of PUT /v1/admin/tenants/{id}/subscription. */
export interface SetSubscriptionRequest {
  plan_id: string;
  status?: 'trialing' | 'active' | 'past_due' | 'cancelled';
  trial_ends_at?: string | null;
  billing_email?: string | null;
  billing_name?: string | null;
  billing_reference?: string | null;
  notes?: string;
}

/** Body of PUT /v1/admin/tenants/{id}/modules/{key}. */
export interface SetModuleRequest {
  source: 'addon' | 'trial' | 'override';
  is_enabled?: boolean;
  ends_at?: string | null;
  note?: string;
}
