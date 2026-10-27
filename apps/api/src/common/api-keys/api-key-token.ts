import { createHash, randomBytes } from 'node:crypto';

/**
 * The token an API key holder sends as `Authorization: Bearer wwk_…` (module 16): a prefix
 * that tells it apart from a Keycloak token, then 32 random bytes. Only its SHA-256 is stored,
 * so a copy of the database gives nobody a working key; the hint is the end of the token,
 * enough to tell keys apart in a list and useless on its own.
 */
export class ApiKeyToken {
  static readonly PREFIX = 'wwk_';
  static readonly RANDOM_BYTES = 32;
  static readonly HINT_LENGTH = 4;

  static generate(): string {
    return `${ApiKeyToken.PREFIX}${randomBytes(ApiKeyToken.RANDOM_BYTES).toString('base64url')}`;
  }

  /** True for a bearer token that is an API key rather than a Keycloak access token. */
  static isApiKey(token: string): boolean {
    return token.startsWith(ApiKeyToken.PREFIX);
  }

  static hashOf(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static hintOf(token: string): string {
    return token.slice(-ApiKeyToken.HINT_LENGTH);
  }
}
