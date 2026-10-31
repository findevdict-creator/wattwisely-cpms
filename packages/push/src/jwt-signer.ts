import { createPrivateKey, sign } from 'node:crypto';

/**
 * The signed tokens both push services want instead of a password (module 34): RS256 with a
 * Google service account's key for Firebase, ES256 with an Apple .p8 key for APNs.
 */
export class JwtSigner {
  static sign(
    header: Record<string, string>,
    claims: Record<string, string | number>,
    privateKeyPem: string,
  ): string {
    const unsigned = `${JwtSigner.part(header)}.${JwtSigner.part(claims)}`;
    const key = createPrivateKey(privateKeyPem);
    const isEc = header['alg'] === 'ES256';
    const signature = sign('sha256', Buffer.from(unsigned), {
      key,
      ...(isEc ? { dsaEncoding: 'ieee-p1363' as const } : {}),
    });
    return `${unsigned}.${signature.toString('base64url')}`;
  }

  private static part(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
