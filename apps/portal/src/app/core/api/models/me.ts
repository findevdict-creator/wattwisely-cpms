import { TenantMembership } from './tenant-membership';

/** GET /v1/me */
export interface Me {
  id: string;
  email: string;
  name: string;
  is_platform_staff: boolean;
  tenants: TenantMembership[];
}
