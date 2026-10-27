/** My role in the admin console, from GET /v1/me; null for anyone who is not Wattwisely staff. */
export interface PlatformRole {
  role: 'admin' | 'billing' | 'support' | 'viewer';
  permissions: string[];
}

/** GET /v1/me, as far as the console needs it. */
export interface Me {
  id: string | null;
  email: string;
  name: string;
  is_platform_staff: boolean;
  platform: PlatformRole | null;
}
