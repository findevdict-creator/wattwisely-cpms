import {
  ChannelCredentials,
  MessagingProvider,
  MessagingSendResult,
  OutboundMessage,
} from './messaging-provider';

/** What the Graph API answers to POST /{phone_number_id}/messages. */
interface GraphAnswer {
  messages?: { id: string }[];
  error?: { message?: string; code?: number };
}

/**
 * WhatsApp through Meta's Cloud API (module 17): one POST per message to
 * `{apiUrl}/{phone_number_id}/messages` with a bearer token. A reply with buttons is an
 * "interactive" message; WhatsApp allows three buttons of twenty characters. The platform's
 * token serves every tenant whose number sits in the platform's WhatsApp Business account;
 * a tenant with its own account brings its own token on its channel.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  static readonly DEFAULT_API_URL = 'https://graph.facebook.com/v21.0';
  static readonly TIMEOUT_MS = 10_000;
  static readonly MAX_BUTTONS = 3;
  static readonly MAX_BUTTON_TITLE = 20;

  readonly provider = 'whatsapp' as const;

  constructor(
    private readonly apiUrl: string,
    private readonly platformAccessToken: string,
  ) {}

  get isEnabled(): boolean {
    return this.platformAccessToken.length > 0;
  }

  async send(
    credentials: ChannelCredentials,
    message: OutboundMessage,
  ): Promise<MessagingSendResult> {
    const token = credentials.accessToken || this.platformAccessToken;
    if (!token) {
      return WhatsAppCloudProvider.failed('No WhatsApp access token is configured.', false);
    }
    const url = `${this.apiUrl.replace(/\/+$/, '')}/${encodeURIComponent(credentials.phoneNumberId)}/messages`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(WhatsAppCloudProvider.body(message)),
        signal: AbortSignal.timeout(WhatsAppCloudProvider.TIMEOUT_MS),
      });
      return WhatsAppCloudProvider.outcome(
        response.status,
        await WhatsAppCloudProvider.json(response),
      );
    } catch (error) {
      return WhatsAppCloudProvider.failed((error as Error).message || 'request failed', true);
    }
  }

  /** The Cloud API message object: plain text, or interactive buttons with the text as body. */
  static body(message: OutboundMessage): Record<string, unknown> {
    const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: message.to };
    const buttons = (message.buttons ?? []).slice(0, WhatsAppCloudProvider.MAX_BUTTONS);
    if (buttons.length === 0) {
      return { ...base, type: 'text', text: { preview_url: true, body: message.text } };
    }
    return {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message.text },
        action: {
          buttons: buttons.map((button) => ({
            type: 'reply',
            reply: {
              id: button.id,
              title: button.title.slice(0, WhatsAppCloudProvider.MAX_BUTTON_TITLE).trim(),
            },
          })),
        },
      },
    };
  }

  private static outcome(status: number, answer: GraphAnswer): MessagingSendResult {
    const id = answer.messages?.[0]?.id ?? null;
    if (status >= 200 && status < 300 && id) {
      return { isSent: true, providerMessageId: id, error: null, isRetryable: false };
    }
    const detail = answer.error?.message ?? `HTTP ${status}`;
    return WhatsAppCloudProvider.failed(detail, status === 429 || status >= 500);
  }

  private static async json(response: Response): Promise<GraphAnswer> {
    try {
      return (await response.json()) as GraphAnswer;
    } catch {
      return {};
    }
  }

  private static failed(error: string, isRetryable: boolean): MessagingSendResult {
    return { isSent: false, providerMessageId: null, error: error.slice(0, 300), isRetryable };
  }
}
