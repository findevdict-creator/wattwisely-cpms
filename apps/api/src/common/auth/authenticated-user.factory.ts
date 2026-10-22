import { Injectable } from '@nestjs/common';
import { AccessTokenClaims } from './access-token-claims';
import { AuthenticatedUser } from './authenticated-user';
import { OrganizationClaimParser } from './organization-claim.parser';

/** Builds an AuthenticatedUser from verified token claims. */
@Injectable()
export class AuthenticatedUserFactory {
  static readonly PLATFORM_STAFF_ROLE = 'platform-staff';

  constructor(private readonly organizationClaimParser: OrganizationClaimParser) {}

  create(claims: AccessTokenClaims): AuthenticatedUser {
    const roles = claims.realm_access?.roles ?? [];
    return new AuthenticatedUser({
      id: claims.sub,
      email: claims.email ?? '',
      name: claims.name ?? claims.preferred_username ?? '',
      isPlatformStaff: roles.includes(AuthenticatedUserFactory.PLATFORM_STAFF_ROLE),
      memberships: this.organizationClaimParser.parse(claims.organization),
    });
  }
}
