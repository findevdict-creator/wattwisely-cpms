import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChatOutbox, ChatReply, ChatText } from '@wattwisely/messaging';
import { WorkerConfig } from '../config/worker.config';
import { ChatChargeFactsBuilder } from './chat-charge-facts';
import { LinkedConversation, MessagingRepository } from './messaging.repository';

/**
 * Tells a driver in their chat how the charge they started from it is doing (module 17):
 * once when the charger starts it, and once when it is over and priced, with the receipt
 * link. `notified_kinds` on the conversation keeps each message once-only.
 */
@Injectable()
export class ChatSessionNotifier {
  static readonly STARTED = new Set(['charging', 'suspended', 'idle', 'stopping', 'completed']);
  static readonly NOT_STARTED = new Set(['not_started', 'failed']);
  private readonly outbox = new ChatOutbox();

  constructor(
    private readonly config: WorkerConfig,
    private readonly runner: TransactionRunner,
    private readonly repository: MessagingRepository,
  ) {}

  /** How many messages were queued for the tenant. */
  run(tenantId: string, now: Date): Promise<number> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      let queued = 0;
      for (const linked of await this.repository.linked(tx)) {
        for (const [kind, reply] of this.due(linked, now)) {
          await this.outbox.enqueue(tx, { id: linked.id, tenantId }, reply);
          await this.repository.addNotified(tx, linked.id, kind);
          queued += 1;
        }
      }
      return queued;
    });
  }

  private due(linked: LinkedConversation, now: Date): [string, ChatReply][] {
    const facts = ChatChargeFactsBuilder.build(linked, now);
    const replies: [string, ChatReply][] = [];
    const isStarted = ChatSessionNotifier.STARTED.has(linked.status);
    if (isStarted && !linked.notifiedKinds.includes('started')) {
      replies.push(['started', ChatText.started(facts)]);
    }
    if (linked.status === 'completed' && (linked.pricedAt || !linked.currency)) {
      replies.push(['finished', { text: ChatText.finished(facts, this.receiptUrl(linked)) }]);
    } else if (ChatSessionNotifier.NOT_STARTED.has(linked.status)) {
      replies.push(['finished', { text: ChatText.notStarted(facts.place) }]);
    }
    return replies;
  }

  private receiptUrl(linked: LinkedConversation): string | null {
    return linked.chargeKey ? `${this.config.driverUrl}/charges/${linked.chargeKey}` : null;
  }
}
