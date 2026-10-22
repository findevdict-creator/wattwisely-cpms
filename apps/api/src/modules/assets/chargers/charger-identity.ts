import { randomInt } from 'node:crypto';

/**
 * The charge point identity in a charger's connection URL (story AST-02).
 * Generated ones read WW-7KQ4M2XR9T: the prefix plus 10 Crockford Base32 characters
 * (no I, L, O or U), about 50 bits of randomness, nothing about the tenant or site.
 * A charger's own identity (often its serial number) is accepted when it is URL-safe.
 */
export class ChargerIdentity {
  static readonly PREFIX = 'WW-';
  static readonly GENERATED_LENGTH = 10;
  static readonly ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static readonly ALLOWED = /^[A-Za-z0-9._-]{1,48}$/;
  /** Shorter identities on a no-password charger are easy to guess; the portal warns. */
  static readonly STRONG_LENGTH = 10;

  static generate(): string {
    let suffix = '';
    for (let index = 0; index < ChargerIdentity.GENERATED_LENGTH; index += 1) {
      suffix += ChargerIdentity.ALPHABET[randomInt(ChargerIdentity.ALPHABET.length)];
    }
    return ChargerIdentity.PREFIX + suffix;
  }

  /** Letters, digits, dash, underscore and dot, at most 48 characters. */
  static isValid(identity: string): boolean {
    return ChargerIdentity.ALLOWED.test(identity);
  }

  static isStrong(identity: string): boolean {
    return identity.length >= ChargerIdentity.STRONG_LENGTH;
  }
}
