/** A quick reply the driver can tap instead of typing. */
export interface ChatButton {
  id: string;
  title: string;
}

/** What the platform says to a driver: a text, and up to three buttons under it. */
export interface ChatReply {
  text: string;
  buttons?: ChatButton[];
}

/** One message to send: the reply and whom to. */
export interface OutboundMessage extends ChatReply {
  /** The driver's number, digits only with the country code first. */
  to: string;
}

/** The tenant's number the message goes out from. */
export interface ChannelCredentials {
  /** The provider's id of the number (WhatsApp's phone number id). */
  phoneNumberId: string;
  /** The tenant's own token; empty means the platform's. */
  accessToken: string;
}

/** What the provider answered, or why the message could not be sent. */
export interface MessagingSendResult {
  isSent: boolean;
  providerMessageId: string | null;
  error: string | null;
  /** True when trying again later could help (the provider was unreachable or rate limited). */
  isRetryable: boolean;
}

/** The token the API and the worker ask Nest for to get the configured provider. */
export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');

/**
 * A messaging app behind one interface (module 17), the way payments sit behind
 * PaymentGateway: WhatsApp Business today, another app or a fake for tests tomorrow.
 */
export interface MessagingProvider {
  readonly provider: 'whatsapp';
  /** False when the platform has no access token and a channel brings none either: nothing can be sent. */
  readonly isEnabled: boolean;
  send(credentials: ChannelCredentials, message: OutboundMessage): Promise<MessagingSendResult>;
}
