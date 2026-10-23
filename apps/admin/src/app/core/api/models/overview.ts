/** GET /v1/admin/overview: the platform at a glance. */
export interface Overview {
  tenants: { total: number; active: number; trial: number; suspended: number; cancelled: number };
  connectors: number;
  ac_connectors: number;
  dc_connectors: number;
  sites: number;
  chargers: number;
  plans: { id: string; code: string; name: string; tenant_count: number }[];
  staff: number;
}
