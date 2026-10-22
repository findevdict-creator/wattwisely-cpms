import { TenantMembership } from '../tenant/tenant-membership';

/** The facts an AuthenticatedUser is built from. */
export interface AuthenticatedUserDetails {
  id: string;
  email: string;
  name: string;
  isPlatformStaff: boolean;
  memberships: TenantMembership[];
}

/** Who is calling, as proven by their access token. Built once per request. */
export class AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly isPlatformStaff: boolean;
  readonly memberships: TenantMembership[];

  constructor(details: AuthenticatedUserDetails) {
    this.id = details.id;
    this.email = details.email;
    this.name = details.name;
    this.isPlatformStaff = details.isPlatformStaff;
    this.memberships = details.memberships;
  }

  findMembership(tenantId: string): TenantMembership | undefined {
    return this.memberships.find((membership) => membership.id === tenantId);
  }
}
