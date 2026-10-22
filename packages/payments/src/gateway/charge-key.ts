import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** What a charge key names once it is opened. */
export interface ParsedChargeKey {
  tenantId: string;
  paymentId: string;
  secret: string;
}

/**
 * The key a driver's page holds for one payment, instead of a login: it names the tenant
 * and the payment and carries a secret whose hash is on the payment row. Opaque to the
 * page; anyone without the secret gets 404. Packed as bytes (two UUIDs and the secret) so
 * it fits a URL parameter: 75 characters.
 */
export class ChargeKey {
  static readonly SECRET_BYTES = 24;
  static readonly UUID_BYTES = 16;
  static readonly LENGTH = 2 * ChargeKey.UUID_BYTES + ChargeKey.SECRET_BYTES;

  static issue(tenantId: string, paymentId: string): { key: string; hash: string } {
    const secret = randomBytes(ChargeKey.SECRET_BYTES);
    const key = Buffer.concat([
      ChargeKey.uuidBytes(tenantId),
      ChargeKey.uuidBytes(paymentId),
      secret,
    ]).toString('base64url');
    const secretText = secret.toString('base64url');
    return { key, hash: ChargeKey.hash(secretText) };
  }

  /** The parts of a key, or null when it was not made by issue(). */
  static parse(key: string): ParsedChargeKey | null {
    const bytes = Buffer.from(key, 'base64url');
    if (bytes.length !== ChargeKey.LENGTH || bytes.toString('base64url') !== key) {
      return null;
    }
    const uuids = ChargeKey.UUID_BYTES;
    return {
      tenantId: ChargeKey.uuidOf(bytes.subarray(0, uuids)),
      paymentId: ChargeKey.uuidOf(bytes.subarray(uuids, 2 * uuids)),
      secret: bytes.subarray(2 * uuids).toString('base64url'),
    };
  }

  static hash(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  static isValid(parsed: ParsedChargeKey, hash: string): boolean {
    const expected = Buffer.from(hash, 'hex');
    const actual = Buffer.from(ChargeKey.hash(parsed.secret), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private static uuidBytes(uuid: string): Buffer {
    return Buffer.from(uuid.replace(/-/g, ''), 'hex');
  }

  private static uuidOf(bytes: Buffer): string {
    const hex = bytes.toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  }
}
