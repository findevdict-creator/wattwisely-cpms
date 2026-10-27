import { HttpStatus, Injectable } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { ApiConfig } from '../../config/api.config';
import { ProblemException } from '../problem/problem.exception';
import { AccessTokenClaims } from './access-token-claims';
import { KeycloakKeySetProvider } from './keycloak-key-set.provider';

/**
 * Checks that an access token is genuine: signed by our Keycloak realm,
 * not expired, and meant for this API or for the driver app's routes (module 19).
 * No call to Keycloak is made per request; the signature is checked locally against
 * Keycloak's public keys. AuthenticatedUserFactory reads which of the two audiences it is.
 */
@Injectable()
export class KeycloakTokenVerifier {
  static readonly ALGORITHMS = ['RS256'];

  constructor(
    private readonly config: ApiConfig,
    private readonly keySetProvider: KeycloakKeySetProvider,
  ) {}

  async verify(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify<AccessTokenClaims>(
        token,
        this.keySetProvider.getKeySet(),
        {
          issuer: this.config.keycloakIssuerUrl,
          audience: [this.config.keycloakAudience, this.config.keycloakDriverAudience],
          algorithms: KeycloakTokenVerifier.ALGORITHMS,
        },
      );
      return payload;
    } catch {
      throw new ProblemException(
        HttpStatus.UNAUTHORIZED,
        'token_invalid',
        'The access token is invalid or has expired.',
      );
    }
  }
}
