/** The facts an AuthenticatedUser is built from. */
export interface AuthenticatedUserDetails {
  keycloakId: string;
  email: string;
  isEmailVerified: boolean;
  name: string;
  isPlatformStaff: boolean;
}

/**
 * Who is calling, as proven by their access token. Built once per request.
 * It says nothing about tenants: memberships and roles come from the database
 * (see StaffAccountResolver and TenantAccessResolver), so removing someone
 * takes effect without waiting for their token to expire.
 */
export class AuthenticatedUser {
  readonly keycloakId: string;
  readonly email: string;
  readonly isEmailVerified: boolean;
  readonly name: string;
  readonly isPlatformStaff: boolean;

  constructor(details: AuthenticatedUserDetails) {
    this.keycloakId = details.keycloakId;
    this.email = details.email;
    this.isEmailVerified = details.isEmailVerified;
    this.name = details.name;
    this.isPlatformStaff = details.isPlatformStaff;
  }
}
