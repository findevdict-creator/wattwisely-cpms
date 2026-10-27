/** How a site's cap is shared among the chargers that are charging (module 17). */
export type LoadStrategy = 'equal_share' | 'priority';

/** GET /v1/sites/{id}/load-management: the policy. Version 0 until it is first saved. */
export interface LoadPolicy {
  is_enabled: boolean;
  limit_kw: number;
  strategy: LoadStrategy;
  min_power_kw: number;
  version: number;
  updated_at: string | null;
}

/** A charger at the site: its load settings and the cap it holds right now. */
export interface LoadCharger {
  id: string;
  identity: string;
  status: string;
  is_online: boolean;
  priority: number;
  max_power_kw: number | null;
  connectors_max_kw: number | null;
  allocated_kw: number | null;
  reason: 'share' | 'minimum' | 'idle' | 'waiting' | 'squeezed' | null;
  is_charging: boolean;
  is_applied: boolean;
  applied_at: string | null;
  last_error: string | null;
}

/** GET /v1/sites/{id}/load-management. */
export interface LoadManagement {
  policy: LoadPolicy;
  chargers: LoadCharger[];
  allocated_kw: number;
  charging_count: number;
}

/** One charger's settings in the PUT body. */
export interface LoadChargerSettingInput {
  charger_id: string;
  priority: number;
  max_power_kw: number | null;
}

/** Body of PUT /v1/sites/{id}/load-management. */
export interface LoadManagementInput {
  is_enabled: boolean;
  limit_kw: number;
  strategy: LoadStrategy;
  min_power_kw: number;
  chargers: LoadChargerSettingInput[];
}
