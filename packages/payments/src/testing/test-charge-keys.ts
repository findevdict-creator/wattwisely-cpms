/**
 * Charge keys for payments a test wrote straight into the database: a known secret, packed
 * the way ChargeKey.issue packs it, so the key opens the payment whose access_key_hash is
 * the hash of accessKey().
 */
export class TestChargeKeys {
  static readonly SECRET = Buffer.alloc(24, 7);

  /** What to store (hashed) on the payment row. */
  static accessKey(): string {
    return TestChargeKeys.SECRET.toString('base64url');
  }

  static keyFor(tenantId: string, paymentId: string): string {
    return Buffer.concat([
      TestChargeKeys.uuidBytes(tenantId),
      TestChargeKeys.uuidBytes(paymentId),
      TestChargeKeys.SECRET,
    ]).toString('base64url');
  }

  private static uuidBytes(uuid: string): Buffer {
    return Buffer.from(uuid.replace(/-/g, ''), 'hex');
  }
}
