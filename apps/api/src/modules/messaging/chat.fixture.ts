import { WhatsAppSignature } from '@wattwisely/messaging';
import { PaymentsFixture } from '../payments/payments.fixture';

/** What else a test delivery from Meta can say. */
export interface DeliveryOptions {
  phoneNumberId?: string;
  id?: string;
  secret?: string;
}

/**
 * The payment fixture plus a driver on WhatsApp: signed deliveries from Meta with one text
 * each, and a look at what the platform queued for the driver (module 17).
 */
export class ChatFixture extends PaymentsFixture {
  static readonly DRIVER = '447700900123';
  static readonly PHONE_NUMBER_ID = '106';
  private delivered = 0;

  /** The charger is online, so a plug can be offered. */
  async startOnline(): Promise<void> {
    await this.start();
    await this.connectedAccount();
    await this.api.addons.chargerOnline(this.acme, this.chargerId);
  }

  /** A signed delivery with one text from the driver. */
  deliver(text: string, options: DeliveryOptions = {}) {
    this.delivered += 1;
    const body = JSON.stringify(ChatFixture.webhookBody(text, options, this.delivered));
    return this.api.call('POST', '/v1/public/messaging/whatsapp', {
      rawBody: body,
      headers: {
        'x-hub-signature-256': WhatsAppSignature.sign(options.secret ?? 'wa-app-secret', body),
      },
    });
  }

  /** The id of the last delivery, for sending the same one again. */
  get lastDeliveryId(): string {
    return `wamid.${this.delivered}`;
  }

  /** What the platform queued for the driver, oldest first. */
  async outbound(): Promise<Record<string, unknown>[]> {
    const { rows } = await this.api.data.sql(
      `select m.body, m.buttons, m.status from messaging_messages m
       join messaging_conversations c on c.id = m.conversation_id
       where c.contact = $1 and m.direction = 'out' order by m.created_at`,
      [ChatFixture.DRIVER],
    );
    return rows;
  }

  private static webhookBody(text: string, options: DeliveryOptions, count: number): object {
    const message = {
      id: options.id ?? `wamid.${count}`,
      from: ChatFixture.DRIVER,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'text',
      text: { body: text },
    };
    const metadata = {
      display_phone_number: '447700900000',
      phone_number_id: options.phoneNumberId ?? ChatFixture.PHONE_NUMBER_ID,
    };
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '1',
          changes: [
            {
              field: 'messages',
              value: { messaging_product: 'whatsapp', metadata, messages: [message] },
            },
          ],
        },
      ],
    };
  }
}
