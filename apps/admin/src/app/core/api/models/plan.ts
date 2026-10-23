/** One plan of the catalogue (GET /v1/admin/plans). Money is in minor units of `currency`. */
export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  currency: string;
  platform_fee: number;
  ac_connector_fee: number;
  dc_connector_fee: number;
  revenue_share_bps: number;
  connector_limit: number | null;
  user_limit: number | null;
  module_keys: string[];
  is_active: boolean;
  sort_order: number;
  version: number;
  tenant_count?: number;
}

/** The editable fields of a plan; `code` only when creating. */
export interface PlanRequest {
  code?: string;
  name?: string;
  description?: string;
  currency?: string;
  platform_fee?: number;
  ac_connector_fee?: number;
  dc_connector_fee?: number;
  revenue_share_bps?: number;
  connector_limit?: number | null;
  user_limit?: number | null;
  module_keys?: string[];
  is_active?: boolean;
  sort_order?: number;
}

/** One add-on module and its price (GET /v1/admin/addons). */
export interface Addon {
  id: string;
  key: string;
  name: string;
  description: string;
  currency: string;
  price: number;
  pricing_unit: 'per_connector' | 'per_site' | 'per_tenant';
  is_active: boolean;
  sort_order: number;
  version: number;
}

/** One module of the product (GET /v1/admin/modules). */
export interface ProductModule {
  key: string;
  name: string;
  description: string;
  kind: 'core' | 'plan' | 'addon';
  permission_keys: string[];
}
