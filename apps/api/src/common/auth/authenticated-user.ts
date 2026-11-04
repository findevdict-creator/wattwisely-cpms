/** Which audience a token was minted for: the portals (staff) or the driver app (module 19). */
export type TokenAudience = 'staff' | 'driver';

/** The facts an AuthenticatedUser is built from. */
export interface AuthenticatedUserDetails {
  keycloakId: string;
  email: string;
  isEmailVerified: boolean;
  name: string;
  audience: TokenAudience;
  /** True when the token was issued to the admin console's Keycloak client (its azp claim). */
  isFromAdminConsole: boolean;
}

/**
 * Who is calling, as proven by their access token. Built once per request.
 * It says nothing about tenants or about being Wattwisely staff: memberships, roles and
 * the staff role come from the database (see StaffAccountResolver, TenantAccessResolver
 * and PlatformAccessResolver), so removing someone takes effect without waiting for their
 * token to expire. The audience says which app the token came from: a driver's token opens
 * the /v1/driver routes and nothing else; only the admin console's own client opens the
 * admin console's routes.
 */
export class AuthenticatedUser {
  readonly keycloakId: string;
  readonly email: string;
  readonly isEmailVerified: boolean;
  readonly name: string;
  readonly audience: TokenAudience;
  readonly isFromAdminConsole: boolean;

  constructor(details: AuthenticatedUserDetails) {
    this.keycloakId = details.keycloakId;
    this.email = details.email;
    this.isEmailVerified = details.isEmailVerified;
    this.name = details.name;
    this.audience = details.audience;
    this.isFromAdminConsole = details.isFromAdminConsole;
  }

  /** A token from the driver app (module 19). */
  get isDriver(): boolean {
    return this.audience === 'driver';
  }
}
