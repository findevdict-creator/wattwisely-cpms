import { TenantMembership } from './tenant-membership';

/** GET /v1/me. id is null until the user's e-mail address is verified. */
export interface Me {
  id: string | null;
  email: string;
  name: string;
  is_platform_staff: boolean;
  tenants: TenantMembership[];
}
