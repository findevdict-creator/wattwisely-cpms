import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ChatOutbox, ChatText } from '@wattwisely/messaging';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ConversationStore } from './conversation.store';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ConversationDto } from './dto/conversation.dto';
import { TestMessageRequestDto } from './dto/test-message-request.dto';
import { MessagingChannelService } from './messaging-channel.service';
import { MessagingErrors } from './messaging-errors';
import { ChannelRecord } from './messaging-record';
import { MessagingRepository } from './messaging.repository';

/**
 * What staff see of the chats (module 17): the latest conversations and each one's messages.
 * A test message is queued here too; the worker sends it like any other, so the token and the
 * number are proven end to end.
 */
@Injectable()
export class ConversationsService {
  private readonly outbox = new ChatOutbox();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: MessagingRepository,
    private readonly conversations: ConversationStore,
  ) {}

  async list(access: TenantAccess): Promise<ConversationDto[]> {
    MessagingChannelService.requireManage(access);
    const records = await this.run(access, (tx) => this.repository.conversations(tx));
    return records.map((record) => new ConversationDto(record));
  }

  async messages(access: TenantAccess, conversationId: string): Promise<ChatMessageDto[]> {
    MessagingChannelService.requireManage(access);
    const records = await this.run(access, async (tx) => {
      if (!(await this.repository.findConversation(tx, conversationId))) {
        throw MessagingErrors.conversationNotFound();
      }
      return this.repository.messages(tx, conversationId);
    });
    return records.map((record) => new ChatMessageDto(record));
  }

  /** Queues a test message to the number; 409 until a channel is set up. Answers the channel. */
  test(access: TenantAccess, request: TestMessageRequestDto): Promise<ChannelRecord> {
    MessagingChannelService.requireManage(access);
    return this.run(access, async (tx) => {
      const channel = await this.repository.findChannel(tx);
      if (!channel) {
        throw MessagingErrors.channelMissing();
      }
      const contact = request.to.replace(/\D/g, '');
      const conversation = await this.conversations.findOrOpen(tx, channel, contact);
      await this.outbox.enqueue(tx, conversation, { text: ChatText.test(access.tenant.name) });
      return channel;
    });
  }

  private run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
  }
}
