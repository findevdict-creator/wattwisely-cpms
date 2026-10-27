import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { MESSAGING_PROVIDER, MessagingProvider, MessagingSendResult } from '@wattwisely/messaging';
import { DueMessage, MessagingRepository } from './messaging.repository';

/**
 * Sends one tenant's due chat messages through the provider and records what came back
 * (module 17). A provider hiccup is tried again after 30 seconds, then two minutes; after
 * that, or on an answer that trying again would not change, the message is failed.
 */
@Injectable()
export class MessageSender {
  static readonly RETRY_SECONDS = [30, 120];

  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: MessagingRepository,
    @Inject(MESSAGING_PROVIDER) private readonly provider: MessagingProvider,
  ) {}

  /** How many messages were handed to the provider. */
  async sendDue(tenantId: string, now: Date): Promise<number> {
    const due = await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.repository.due(tx, now),
    );
    for (const message of due) {
      const result = await this.provider.send(
        { phoneNumberId: message.phoneNumberId, accessToken: message.accessToken },
        { to: message.contact, text: message.body, buttons: message.buttons ?? undefined },
      );
      await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
        result.isSent
          ? this.repository.markSent(tx, message.id, result.providerMessageId ?? '', now)
          : this.repository.markFailed(
              tx,
              message.id,
              result.error ?? 'unknown error',
              MessageSender.nextAttempt(message, result, now),
            ),
      );
    }
    return due.length;
  }

  private static nextAttempt(
    message: DueMessage,
    result: MessagingSendResult,
    now: Date,
  ): Date | null {
    const waitS = MessageSender.RETRY_SECONDS[message.attempts];
    if (!result.isRetryable || waitS === undefined) {
      return null;
    }
    return new Date(now.getTime() + waitS * 1000);
  }
}
