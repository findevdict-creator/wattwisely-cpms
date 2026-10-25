import {
  exportJWK,
  generateKeyPair,
  JWTVerifyGetKey,
  SignJWT,
  createLocalJWKSet,
  CryptoKey,
} from 'jose';
import { AccessTokenClaims } from '../common/auth/access-token-claims';

/**
 * Plays the part of Keycloak in tests: it owns a signing key, publishes the
 * matching public key set and signs access tokens with chosen claims.
 */
export class TestTokenIssuer {
  static readonly ISSUER = 'http://auth.test/realms/wattwisely';
  static readonly AUDIENCE = 'wattwisely-api';
  static readonly DRIVER_AUDIENCE = 'wattwisely-driver';

  private privateKey!: CryptoKey;
  private keySet!: JWTVerifyGetKey;

  async init(): Promise<this> {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const publicJwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };
    this.privateKey = privateKey;
    this.keySet = createLocalJWKSet({ keys: [publicJwk] });
    return this;
  }

  getKeySet(): JWTVerifyGetKey {
    return this.keySet;
  }

  async sign(claims: Partial<AccessTokenClaims>, overrides: TokenOverrides = {}): Promise<string> {
    return new SignJWT({ sub: 'user-1', email_verified: true, ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(overrides.issuer ?? TestTokenIssuer.ISSUER)
      .setAudience(overrides.audience ?? TestTokenIssuer.AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(overrides.expiresAt ?? '5m')
      .sign(this.privateKey);
  }

  /** A token for a person created with TestData. */
  async signFor(person: { keycloakId: string; email: string }): Promise<string> {
    return this.sign({ sub: person.keycloakId, email: person.email });
  }

  /** A token from the driver app (module 19): the driver audience, a name, a verified address. */
  async signForDriver(driver: {
    keycloakId: string;
    email: string;
    name?: string;
    isEmailVerified?: boolean;
  }): Promise<string> {
    return this.sign(
      {
        sub: driver.keycloakId,
        email: driver.email,
        name: driver.name ?? '',
        email_verified: driver.isEmailVerified ?? true,
      },
      { audience: TestTokenIssuer.DRIVER_AUDIENCE },
    );
  }
}

/** Ways a test can make a token wrong on purpose. */
export interface TokenOverrides {
  issuer?: string;
  audience?: string;
  expiresAt?: number | string;
}
