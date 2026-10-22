import { BootFingerprint } from '@wattwisely/db';

/** The answer to a boot: accepted (with a fingerprint to store on a first boot) or rejected with a reason. */
export interface BootVerdict {
  status: 'accepted' | 'rejected';
  fingerprint: BootFingerprint | null;
  reason: string | null;
}

/**
 * For chargers without a password, what they say about themselves at boot is their
 * identity (story AST-02). The first accepted boot stores vendor, model and serial;
 * a later boot with another vendor or serial is rejected. Firmware may change freely.
 */
export class BootFingerprintVerifier {
  static readonly MISMATCH = 'fingerprint_mismatch';

  static verify(
    authMode: 'password' | 'none',
    stored: BootFingerprint | null,
    reported: BootFingerprint,
  ): BootVerdict {
    if (authMode === 'password') {
      return { status: 'accepted', fingerprint: null, reason: null };
    }
    if (!stored) {
      return { status: 'accepted', fingerprint: reported, reason: null };
    }
    return BootFingerprintVerifier.matches(stored, reported)
      ? { status: 'accepted', fingerprint: null, reason: null }
      : { status: 'rejected', fingerprint: null, reason: BootFingerprintVerifier.MISMATCH };
  }

  /** Vendor and serial must match; without serials, the model stands in for one. */
  private static matches(stored: BootFingerprint, reported: BootFingerprint): boolean {
    if (stored.vendor !== reported.vendor) {
      return false;
    }
    return stored.serial === null && reported.serial === null
      ? stored.model === reported.model
      : stored.serial === reported.serial;
  }
}
