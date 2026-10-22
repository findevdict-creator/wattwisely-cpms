import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, JWTVerifyGetKey } from 'jose';
import { ApiConfig } from '../../config/api.config';

/**
 * Holds Keycloak's public signing keys. The keys are downloaded once and cached;
 * jose fetches them again only when Keycloak starts signing with a new key.
 * Tests replace this provider with a local key set.
 */
@Injectable()
export class KeycloakKeySetProvider {
  private readonly keySet: JWTVerifyGetKey;

  constructor(private readonly config: ApiConfig) {
    this.keySet = createRemoteJWKSet(new URL(config.keycloakJwksUrl));
  }

  getKeySet(): JWTVerifyGetKey {
    return this.keySet;
  }

  async isReachable(): Promise<boolean> {
    try {
      const response = await fetch(this.config.keycloakJwksUrl, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
