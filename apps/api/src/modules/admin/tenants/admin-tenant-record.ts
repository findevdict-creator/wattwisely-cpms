import { tenants } from '@wattwisely/db';
import { TenantOverviewRecord } from '../../subscription/tenant-overview.repository';

/** One tenants row. */
export type TenantRecord = typeof tenants.$inferSelect;

/** A tenant with its plan and size, one row of the admin console's tenant list. */
export interface AdminTenantRecord {
  tenant: TenantRecord;
  plan: { id: string; code: string; name: string } | null;
  subscriptionStatus: string | null;
  overview: TenantOverviewRecord;
}
