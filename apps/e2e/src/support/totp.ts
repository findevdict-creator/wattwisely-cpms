import { createHmac } from 'node:crypto';

/**
 * Time-based one-time codes (RFC 6238) as an authenticator app makes them, for Keycloak's
 * two-factor login: HMAC-SHA1, 6 digits, 30 seconds, the realm's policy. Keycloak's set-up
 * form carries the secret as plain text, so the key is its UTF-8 bytes.
 */
export class Totp {
  static readonly PERIOD_S = 30;

  static code(secret: string, at = Date.now()): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / Totp.PERIOD_S)));
    const digest = createHmac('sha1', Buffer.from(secret, 'utf8')).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const value = digest.readUInt32BE(offset) & 0x7fffffff;
    return String(value % 1_000_000).padStart(6, '0');
  }

  /** Waits out the end of a period, so a code is not refused because it expired on the way. */
  static async freshCode(secret: string): Promise<string> {
    const left = Totp.PERIOD_S * 1000 - (Date.now() % (Totp.PERIOD_S * 1000));
    if (left < 4000) {
      await new Promise((resolve) => setTimeout(resolve, left + 200));
    }
    return Totp.code(secret);
  }
}
