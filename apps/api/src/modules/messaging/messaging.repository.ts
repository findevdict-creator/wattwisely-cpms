import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  chargers,
  chargingSessions,
  connectors,
  messagingChannels,
  messagingConversations,
  messagingMessages,
  Transaction,
} from '@wattwisely/db';
import { ChannelRecord, ConversationRecord, MessageRecord } from './messaging-record';

/** What PUT /v1/messaging/channel writes; `accessToken` undefined keeps the stored one. */
export interface ChannelWrite {
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken?: string;
  greeting: string;
  isActive: boolean;
}

/** Reads and writes a tenant's chat channel, conversations and messages (module 17). */
@Injectable()
export class MessagingRepository {
  static readonly CONVERSATIONS = 50;
  static readonly MESSAGES = 200;

  /** The tenant's channel; under a phone-number session, the channel that number belongs to. */
  async findChannel(tx: Transaction): Promise<ChannelRecord | null> {
    const rows = await tx
      .select({
        id: messagingChannels.id,
        tenantId: messagingChannels.tenantId,
        provider: messagingChannels.provider,
        phoneNumberId: messagingChannels.phoneNumberId,
        displayPhoneNumber: messagingChannels.displayPhoneNumber,
        hasAccessToken: sql<boolean>`${messagingChannels.accessToken} <> ''`,
        greeting: messagingChannels.greeting,
        isActive: messagingChannels.isActive,
        version: messagingChannels.version,
        createdAt: messagingChannels.createdAt,
        updatedAt: messagingChannels.updatedAt,
      })
      .from(messagingChannels)
      .limit(1);
    return rows[0] ?? null;
  }

  async insertChannel(
    tx: Transaction,
    at: { id: string; tenantId: string; accountId: string },
    channel: ChannelWrite,
  ): Promise<void> {
    await tx.insert(messagingChannels).values({
      id: at.id,
      tenantId: at.tenantId,
      provider: 'whatsapp',
      phoneNumberId: channel.phoneNumberId,
      displayPhoneNumber: channel.displayPhoneNumber,
      accessToken: channel.accessToken ?? '',
      greeting: channel.greeting,
      isActive: channel.isActive,
      createdBy: at.accountId,
      updatedBy: at.accountId,
    });
  }

  /** False when the stored version is not `expectedVersion`. */
  async updateChannel(
    tx: Transaction,
    at: { id: string; accountId: string },
    channel: ChannelWrite,
    expectedVersion: number,
  ): Promise<boolean> {
    const rows = await tx
      .update(messagingChannels)
      .set({
        phoneNumberId: channel.phoneNumberId,
        displayPhoneNumber: channel.displayPhoneNumber,
        accessToken: channel.accessToken,
        greeting: channel.greeting,
        isActive: channel.isActive,
        updatedBy: at.accountId,
        version: sql`${messagingChannels.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(messagingChannels.id, at.id), eq(messagingChannels.version, expectedVersion)))
      .returning({ id: messagingChannels.id });
    return rows.length > 0;
  }

  conversations(tx: Transaction): Promise<ConversationRecord[]> {
    return tx
      .select(MessagingRepository.CONVERSATION)
      .from(messagingConversations)
      .leftJoin(chargers, eq(chargers.id, messagingConversations.chargerId))
      .leftJoin(connectors, eq(connectors.id, messagingConversations.connectorId))
      .leftJoin(chargingSessions, eq(chargingSessions.id, messagingConversations.sessionId))
      .orderBy(desc(messagingConversations.updatedAt))
      .limit(MessagingRepository.CONVERSATIONS);
  }

  async findConversation(tx: Transaction, id: string): Promise<ConversationRecord | null> {
    const rows = await tx
      .select(MessagingRepository.CONVERSATION)
      .from(messagingConversations)
      .leftJoin(chargers, eq(chargers.id, messagingConversations.chargerId))
      .leftJoin(connectors, eq(connectors.id, messagingConversations.connectorId))
      .leftJoin(chargingSessions, eq(chargingSessions.id, messagingConversations.sessionId))
      .where(eq(messagingConversations.id, id));
    return rows[0] ?? null;
  }

  messages(tx: Transaction, conversationId: string): Promise<MessageRecord[]> {
    return tx
      .select({
        id: messagingMessages.id,
        direction: messagingMessages.direction,
        status: messagingMessages.status,
        body: messagingMessages.body,
        buttons: messagingMessages.buttons,
        error: messagingMessages.error,
        sentAt: messagingMessages.sentAt,
        createdAt: messagingMessages.createdAt,
      })
      .from(messagingMessages)
      .where(eq(messagingMessages.conversationId, conversationId))
      .orderBy(messagingMessages.createdAt)
      .limit(MessagingRepository.MESSAGES);
  }

  private static readonly CONVERSATION = {
    id: messagingConversations.id,
    contact: messagingConversations.contact,
    chargerIdentity: chargers.ocppIdentity,
    ocppConnectorId: connectors.ocppConnectorId,
    sessionId: sql<string>`coalesce(${messagingConversations.sessionId}::text, '')`,
    sessionStatus: sql<string | null>`${chargingSessions.status}::text`,
    linkToken: messagingConversations.linkToken,
    lastInboundAt: messagingConversations.lastInboundAt,
    lastOutboundAt: messagingConversations.lastOutboundAt,
    updatedAt: messagingConversations.updatedAt,
  };
}
