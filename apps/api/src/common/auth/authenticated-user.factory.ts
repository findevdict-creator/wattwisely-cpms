import { Injectable } from '@nestjs/common';
import { ApiConfig } from '../../config/api.config';
import { AccessTokenClaims } from './access-token-claims';
import { AuthenticatedUser, TokenAudience } from './authenticated-user';

/**
 * Builds an AuthenticatedUser from verified token claims. The audience claim decides which
 * app the token came from: a token naming the driver audience is a driver's (module 19) and
 * opens only the /v1/driver routes; any other accepted token is a staff token.
 */
@Injectable()
export class AuthenticatedUserFactory {
  static readonly PLATFORM_STAFF_ROLE = 'platform-staff';

  constructor(private readonly config: ApiConfig) {}

  create(claims: AccessTokenClaims): AuthenticatedUser {
    const roles = claims.realm_access?.roles ?? [];
    return new AuthenticatedUser({
      keycloakId: claims.sub,
      email: claims.email ?? '',
      isEmailVerified: claims.email_verified === true,
      name: claims.name ?? claims.preferred_username ?? '',
      isPlatformStaff: roles.includes(AuthenticatedUserFactory.PLATFORM_STAFF_ROLE),
      audience: this.audienceOf(claims),
    });
  }

  /** Driver when the token names the driver audience and not the API's: a token for both is nobody's. */
  private audienceOf(claims: AccessTokenClaims): TokenAudience {
    const audiences = AuthenticatedUserFactory.audiencesOf(claims);
    const isDriver =
      audiences.includes(this.config.keycloakDriverAudience) &&
      !audiences.includes(this.config.keycloakAudience);
    return isDriver ? 'driver' : 'staff';
  }

  private static audiencesOf(claims: AccessTokenClaims): string[] {
    if (Array.isArray(claims.aud)) {
      return claims.aud;
    }
    return claims.aud ? [claims.aud] : [];
  }
}
