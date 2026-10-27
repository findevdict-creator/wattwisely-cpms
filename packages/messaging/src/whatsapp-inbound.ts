/** One message a driver sent, as the webhook delivered it. */
export interface InboundMessage {
  /** The provider's id of the message; a webhook delivered twice carries the same id. */
  providerMessageId: string;
  /** The provider's id of the number it came to: which tenant's channel. */
  phoneNumberId: string;
  /** The driver's number, digits only. */
  from: string;
  /** What they typed, or the id of the button they tapped. */
  text: string;
  /** True when `text` is a button id rather than typed words. */
  isButton: boolean;
  receivedAt: Date;
}

/** The parts of Meta's webhook body this class reads. */
interface WebhookBody {
  entry?: { changes?: { value?: ChangeValue }[] }[];
}

interface ChangeValue {
  metadata?: { phone_number_id?: string };
  messages?: RawMessage[];
}

interface RawMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { payload?: string; text?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
}

/**
 * Reads the messages out of a WhatsApp Cloud API webhook body (module 17). Status updates
 * (sent, delivered, read) and media are left out: the platform answers words and button taps.
 */
export class WhatsAppInbound {
  static parse(body: unknown): InboundMessage[] {
    const entries = (body as WebhookBody | null)?.entry ?? [];
    const messages: InboundMessage[] = [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        messages.push(...WhatsAppInbound.ofChange(change.value));
      }
    }
    return messages;
  }

  private static ofChange(value: ChangeValue | undefined): InboundMessage[] {
    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!phoneNumberId) {
      return [];
    }
    return (value?.messages ?? [])
      .map((raw) => WhatsAppInbound.ofMessage(phoneNumberId, raw))
      .filter((message): message is InboundMessage => message !== null);
  }

  private static ofMessage(phoneNumberId: string, raw: RawMessage): InboundMessage | null {
    const words = WhatsAppInbound.wordsOf(raw);
    if (!raw.id || !raw.from || !words) {
      return null;
    }
    const seconds = Number(raw.timestamp);
    return {
      providerMessageId: raw.id,
      phoneNumberId,
      from: raw.from.replace(/\D/g, ''),
      text: words.text,
      isButton: words.isButton,
      receivedAt: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date(),
    };
  }

  private static wordsOf(raw: RawMessage): { text: string; isButton: boolean } | null {
    if (raw.type === 'text') {
      return WhatsAppInbound.words(raw.text?.body, false);
    }
    if (raw.type === 'interactive') {
      return WhatsAppInbound.words(raw.interactive?.button_reply?.id, true);
    }
    if (raw.type === 'button') {
      return WhatsAppInbound.words(raw.button?.payload ?? raw.button?.text, true);
    }
    return null;
  }

  private static words(
    text: string | undefined,
    isButton: boolean,
  ): { text: string; isButton: boolean } | null {
    return text ? { text, isButton } : null;
  }
}
