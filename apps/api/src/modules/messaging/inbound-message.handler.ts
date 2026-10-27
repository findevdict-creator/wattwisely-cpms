import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, tenants, Transaction, TransactionRunner } from '@wattwisely/db';
import { ChatCommandParser, ChatOutbox, InboundMessage } from '@wattwisely/messaging';
import { ChannelResolver } from './channel.resolver';
import { ChatReplier } from './chat-replier';
import { ConversationStore } from './conversation.store';
import { ChannelRecord } from './messaging-record';

/**
 * One driver message, from the number it came to, to the reply waiting in the outbox (module
 * 17). A paused channel, a number nobody set up, a tenant without the add-on, or a delivery
 * seen before gets no reply.
 */
@Injectable()
export class InboundMessageHandler {
  private readonly logger = new Logger(InboundMessageHandler.name);
  private readonly outbox = new ChatOutbox();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly channels: ChannelResolver,
    private readonly conversations: ConversationStore,
    private readonly replier: ChatReplier,
  ) {}

  /** True when a reply was queued. */
  async handle(message: InboundMessage): Promise<boolean> {
    const channel = await this.channels.resolve(message.phoneNumberId);
    if (!channel) {
      this.logger.warn(`No active channel for phone number id ${message.phoneNumberId}`);
      return false;
    }
    return this.runner.run(DatabaseSession.forTenant(channel.tenantId), (tx) =>
      this.handleIn(tx, channel, message),
    );
  }

  private async handleIn(
    tx: Transaction,
    channel: ChannelRecord,
    message: InboundMessage,
  ): Promise<boolean> {
    if (!(await this.channels.isEntitled(tx, channel.tenantId))) {
      return false;
    }
    const conversation = await this.conversations.findOrOpen(tx, channel, message.from);
    if (!(await this.conversations.recordInbound(tx, conversation, message))) {
      return false;
    }
    const command = ChatCommandParser.parse(message.text);
    const reply = await this.replier.reply(tx, conversation, command, {
      tenantName: await InboundMessageHandler.tenantName(tx),
      greeting: channel.greeting,
    });
    await this.outbox.enqueue(tx, conversation, reply);
    return true;
  }

  private static async tenantName(tx: Transaction): Promise<string> {
    const rows = await tx.select({ name: tenants.name }).from(tenants).limit(1);
    return rows[0]?.name ?? 'the operator';
  }
}
