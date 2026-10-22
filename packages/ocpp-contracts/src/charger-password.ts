import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * The password a charger sends with HTTP Basic auth when it connects (story AST-02).
 * Generated once, shown once, and only its scrypt hash is stored, so a database leak
 * does not hand out charger passwords. The OCPP gateway calls `matches` at connection time.
 */
export class ChargerPassword {
  static readonly LENGTH = 24;
  /** Letters and digits chargers' setup screens all accept, without look-alikes. */
  static readonly ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  static readonly KEY_LENGTH = 32;
  static readonly SALT_LENGTH = 16;

  static generate(): string {
    let password = '';
    for (let index = 0; index < ChargerPassword.LENGTH; index += 1) {
      password += ChargerPassword.ALPHABET[randomInt(ChargerPassword.ALPHABET.length)];
    }
    return password;
  }

  /** "scrypt$<salt>$<hash>", both base64url. */
  static hash(password: string): string {
    const salt = randomBytes(ChargerPassword.SALT_LENGTH);
    const hash = scryptSync(password, salt, ChargerPassword.KEY_LENGTH);
    return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  }

  static matches(password: string, storedHash: string): boolean {
    const [scheme, salt, hash] = storedHash.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) {
      return false;
    }
    const expected = Buffer.from(hash, 'base64url');
    const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length);
    return timingSafeEqual(actual, expected);
  }
}
