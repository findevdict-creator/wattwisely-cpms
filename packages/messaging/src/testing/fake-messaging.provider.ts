import {
  ChannelCredentials,
  MessagingProvider,
  MessagingSendResult,
  OutboundMessage,
} from '../messaging-provider';

/** One message the fake was asked to send. */
export interface FakeSentMessage {
  credentials: ChannelCredentials;
  message: OutboundMessage;
}

/** A messaging app in memory: records every send and answers as told. */
export class FakeMessagingProvider implements MessagingProvider {
  readonly provider = 'whatsapp' as const;
  readonly isEnabled = true;
  readonly sent: FakeSentMessage[] = [];
  /** When set, every send fails with this text until cleared. */
  failWith: string | null = null;
  private counter = 0;

  async send(
    credentials: ChannelCredentials,
    message: OutboundMessage,
  ): Promise<MessagingSendResult> {
    this.sent.push({ credentials, message });
    if (this.failWith) {
      return { isSent: false, providerMessageId: null, error: this.failWith, isRetryable: true };
    }
    this.counter += 1;
    return {
      isSent: true,
      providerMessageId: `wamid.fake-${this.counter}`,
      error: null,
      isRetryable: false,
    };
  }

  /** The texts sent to one number, oldest first. */
  textsTo(to: string): string[] {
    return this.sent.filter((entry) => entry.message.to === to).map((entry) => entry.message.text);
  }

  reset(): void {
    this.sent.length = 0;
    this.failWith = null;
  }
}
