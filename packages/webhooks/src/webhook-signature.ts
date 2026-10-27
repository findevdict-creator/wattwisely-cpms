import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The Wattwisely-Signature header (module 16): `t=<unix seconds>,v1=<hex HMAC-SHA256>` where
 * the MAC is over `<t>.<body>` with the endpoint's secret. The timestamp is signed too, so a
 * captured delivery cannot be replayed later than the receiver's tolerance allows. Receivers
 * verify with this class, or with the same few lines in any language.
 */
export class WebhookSignature {
  static readonly HEADER = 'wattwisely-signature';
  static readonly VERSION = 'v1';
  /** How far the signed time may be from the receiver's clock, in seconds. */
  static readonly TOLERANCE_SECONDS = 300;

  static sign(secret: string, body: string, signedAt: Date): string {
    const timestamp = Math.floor(signedAt.getTime() / 1000);
    const mac = WebhookSignature.mac(secret, timestamp, body);
    return `t=${timestamp},${WebhookSignature.VERSION}=${mac}`;
  }

  /** True when the header was made with the secret for this body, not too long ago. */
  static verify(secret: string, header: string, body: string, now: Date = new Date()): boolean {
    const parts = WebhookSignature.parse(header);
    if (!parts) {
      return false;
    }
    const age = Math.abs(Math.floor(now.getTime() / 1000) - parts.timestamp);
    if (age > WebhookSignature.TOLERANCE_SECONDS) {
      return false;
    }
    const expected = Buffer.from(WebhookSignature.mac(secret, parts.timestamp, body), 'hex');
    const given = Buffer.from(parts.mac, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  private static parse(header: string): { timestamp: number; mac: string } | null {
    const fields = new Map(
      header.split(',').map((field) => field.trim().split('=', 2) as [string, string]),
    );
    const timestamp = Number(fields.get('t'));
    const mac = fields.get(WebhookSignature.VERSION) ?? '';
    if (!Number.isInteger(timestamp) || !/^[0-9a-f]{64}$/.test(mac)) {
      return null;
    }
    return { timestamp, mac };
  }

  private static mac(secret: string, timestamp: number, body: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  }
}
