import { Injectable } from '@nestjs/common';
import { WhatsAppInbound, WhatsAppSignature } from '@wattwisely/messaging';
import { ApiConfig } from '../../config/api.config';
import { InboundMessageHandler } from './inbound-message.handler';
import { MessagingErrors } from './messaging-errors';

/** What the webhook answers Meta after a delivery. */
export interface WebhookReceipt {
  received: number;
  replied: number;
}

/**
 * Meta's webhook for the WhatsApp Business app (module 17). Subscribing sends a GET with a
 * verify token to echo; every delivery after that is a POST signed over its exact bytes.
 */
@Injectable()
export class WhatsAppWebhookService {
  constructor(
    private readonly config: ApiConfig,
    private readonly handler: InboundMessageHandler,
  ) {}

  /** The challenge to echo, or 403 when the token is not ours. */
  verify(query: Record<string, string | undefined>): string {
    const isOurs =
      query['hub.mode'] === 'subscribe' &&
      this.config.whatsappVerifyToken.length > 0 &&
      query['hub.verify_token'] === this.config.whatsappVerifyToken;
    if (!isOurs) {
      throw MessagingErrors.verifyRefused();
    }
    return query['hub.challenge'] ?? '';
  }

  async receive(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<WebhookReceipt> {
    const body = rawBody ?? Buffer.alloc(0);
    if (!WhatsAppSignature.verify(this.config.whatsappAppSecret, signature, body)) {
      throw MessagingErrors.signatureInvalid();
    }
    const messages = WhatsAppInbound.parse(WhatsAppWebhookService.json(body));
    let replied = 0;
    for (const message of messages) {
      replied += (await this.handler.handle(message)) ? 1 : 0;
    }
    return { received: messages.length, replied };
  }

  private static json(body: Buffer): unknown {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return null;
    }
  }
}
