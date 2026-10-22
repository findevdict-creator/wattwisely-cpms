import { Injectable } from '@nestjs/common';
import { AccessTokenClaims } from './access-token-claims';
import { AuthenticatedUser } from './authenticated-user';

/** Builds an AuthenticatedUser from verified token claims. */
@Injectable()
export class AuthenticatedUserFactory {
  static readonly PLATFORM_STAFF_ROLE = 'platform-staff';

  create(claims: AccessTokenClaims): AuthenticatedUser {
    const roles = claims.realm_access?.roles ?? [];
    return new AuthenticatedUser({
      keycloakId: claims.sub,
      email: claims.email ?? '',
      isEmailVerified: claims.email_verified === true,
      name: claims.name ?? claims.preferred_username ?? '',
      isPlatformStaff: roles.includes(AuthenticatedUserFactory.PLATFORM_STAFF_ROLE),
    });
  }
}
