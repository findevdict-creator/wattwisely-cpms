import { randomBytes } from 'node:crypto';

/** The signing secret of an endpoint: `whsec_` and 32 random bytes, made when the endpoint is. */
export class WebhookSecret {
  static readonly PREFIX = 'whsec_';
  static readonly RANDOM_BYTES = 32;

  static generate(): string {
    return `${WebhookSecret.PREFIX}${randomBytes(WebhookSecret.RANDOM_BYTES).toString('base64url')}`;
  }
}
