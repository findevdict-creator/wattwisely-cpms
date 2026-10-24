/** How much of the plan the company uses. */
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

/** One module and whether this company has it. */
export interface PlanModule {
  key: string;
  name: string;
  description: string;
  kind: 'core' | 'plan' | 'addon';
  is_enabled: boolean;
  source: 'core' | 'plan' | 'addon' | 'trial' | 'override' | null;
  ends_at: string | null;
  price: { amount: number; currency: string; pricing_unit: string } | null;
}

/** GET /v1/subscription: the plan, its limits and modules, as the company sees them. */
export interface Subscription {
  plan: { code: string; name: string; description: string; currency: string } | null;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | null;
  started_at: string | null;
  trial_ends_at: string | null;
  billing_email: string | null;
  billing_name: string | null;
  billing_reference: string | null;
  /** Tax on Wattwisely's invoices in basis points: 2000 is 20 %. */
  tax_rate_bps: number;
  usage: PlanUsage;
  modules: PlanModule[];
}
