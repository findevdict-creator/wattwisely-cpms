/** Which audience a token was minted for: the portals (staff) or the driver app (module 19). */
export type TokenAudience = 'staff' | 'driver';

/** The facts an AuthenticatedUser is built from. */
export interface AuthenticatedUserDetails {
  keycloakId: string;
  email: string;
  isEmailVerified: boolean;
  name: string;
  isPlatformStaff: boolean;
  audience: TokenAudience;
}

/**
 * Who is calling, as proven by their access token. Built once per request.
 * It says nothing about tenants: memberships and roles come from the database
 * (see StaffAccountResolver and TenantAccessResolver), so removing someone
 * takes effect without waiting for their token to expire. The audience says which
 * app the token came from: a driver's token opens the /v1/driver routes and nothing else.
 */
export class AuthenticatedUser {
  readonly keycloakId: string;
  readonly email: string;
  readonly isEmailVerified: boolean;
  readonly name: string;
  readonly isPlatformStaff: boolean;
  readonly audience: TokenAudience;

  constructor(details: AuthenticatedUserDetails) {
    this.keycloakId = details.keycloakId;
    this.email = details.email;
    this.isEmailVerified = details.isEmailVerified;
    this.name = details.name;
    this.isPlatformStaff = details.isPlatformStaff;
    this.audience = details.audience;
  }

  /** A token from the driver app (module 19). */
  get isDriver(): boolean {
    return this.audience === 'driver';
  }
}
