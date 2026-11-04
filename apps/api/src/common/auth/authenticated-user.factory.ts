import { Injectable } from '@nestjs/common';
import { ApiConfig } from '../../config/api.config';
import { AccessTokenClaims } from './access-token-claims';
import { AuthenticatedUser, TokenAudience } from './authenticated-user';

/**
 * Builds an AuthenticatedUser from verified token claims. The audience claim decides which
 * app the token came from: a token naming the driver audience is a driver's (module 19) and
 * opens only the /v1/driver routes; any other accepted token is a staff token. No claim says
 * whether someone is Wattwisely staff: the platform_staff table does (PlatformAccessResolver).
 */
@Injectable()
export class AuthenticatedUserFactory {
  constructor(private readonly config: ApiConfig) {}

  create(claims: AccessTokenClaims): AuthenticatedUser {
    return new AuthenticatedUser({
      keycloakId: claims.sub,
      email: claims.email ?? '',
      isEmailVerified: claims.email_verified === true,
      name: claims.name ?? claims.preferred_username ?? '',
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
