import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Meta signs every webhook delivery over the exact bytes of the body:
 * `X-Hub-Signature-256: sha256=<hex HMAC-SHA256 with the app secret>`. A delivery without a
 * matching signature is not from Meta and is dropped (module 17).
 */
export class WhatsAppSignature {
  static readonly HEADER = 'x-hub-signature-256';
  static readonly PREFIX = 'sha256=';

  static sign(appSecret: string, body: string | Buffer): string {
    return `${WhatsAppSignature.PREFIX}${createHmac('sha256', appSecret).update(body).digest('hex')}`;
  }

  static verify(appSecret: string, header: string | undefined, body: string | Buffer): boolean {
    if (!appSecret || !header?.startsWith(WhatsAppSignature.PREFIX)) {
      return false;
    }
    const given = Buffer.from(header.slice(WhatsAppSignature.PREFIX.length), 'hex');
    const expected = Buffer.from(
      WhatsAppSignature.sign(appSecret, body).slice(WhatsAppSignature.PREFIX.length),
      'hex',
    );
    return given.length === expected.length && timingSafeEqual(given, expected);
  }
}
