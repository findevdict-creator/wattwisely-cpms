import { TenantMembership } from './tenant-membership';

/** My Wattwisely staff role, when I have one; the portal only uses it to offer a link to the admin console. */
export interface PlatformRole {
  role: string;
  permissions: string[];
}

/** GET /v1/me. id is null until the user's e-mail address is verified. */
export interface Me {
  id: string | null;
  email: string;
  name: string;
  is_platform_staff: boolean;
  platform: PlatformRole | null;
  tenants: TenantMembership[];
}
