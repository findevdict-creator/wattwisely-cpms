import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { messagingConversations, messagingMessages, Transaction, UuidV7 } from '@wattwisely/db';

/** The conversation a driver's message belongs to, as the chat handler needs it. */
export interface ChatConversation {
  id: string;
  tenantId: string;
  channelId: string;
  contact: string;
  chargerId: string | null;
  connectorId: string | null;
  sessionId: string | null;
  linkToken: string;
  /** True when this message opened the conversation. */
  isNew: boolean;
}

/** Finds or opens a driver's conversation, and keeps what it is about (module 17). */
@Injectable()
export class ConversationStore {
  /** The conversation of this contact on the channel, opened now if there was none. */
  async findOrOpen(
    tx: Transaction,
    channel: { id: string; tenantId: string },
    contact: string,
  ): Promise<ChatConversation> {
    const found = await this.find(tx, channel.id, contact);
    if (found) {
      return found;
    }
    const opened = {
      id: UuidV7.create(),
      tenantId: channel.tenantId,
      channelId: channel.id,
      contact,
      chargerId: null,
      connectorId: null,
      sessionId: null,
      linkToken: randomBytes(18).toString('base64url'),
    };
    await tx.insert(messagingConversations).values(opened);
    return { ...opened, isNew: true };
  }

  private async find(
    tx: Transaction,
    channelId: string,
    contact: string,
  ): Promise<ChatConversation | null> {
    const rows = await tx
      .select({
        id: messagingConversations.id,
        tenantId: messagingConversations.tenantId,
        channelId: messagingConversations.channelId,
        contact: messagingConversations.contact,
        chargerId: messagingConversations.chargerId,
        connectorId: messagingConversations.connectorId,
        sessionId: messagingConversations.sessionId,
        linkToken: messagingConversations.linkToken,
      })
      .from(messagingConversations)
      .where(
        and(
          eq(messagingConversations.channelId, channelId),
          eq(messagingConversations.contact, contact),
        ),
      );
    return rows[0] ? { ...rows[0], isNew: false } : null;
  }

  /** Stores the driver's message; false when this delivery was seen before. */
  async recordInbound(
    tx: Transaction,
    conversation: ChatConversation,
    message: { providerMessageId: string; text: string; receivedAt: Date },
  ): Promise<boolean> {
    const rows = await tx
      .insert(messagingMessages)
      .values({
        id: UuidV7.create(),
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        direction: 'in',
        status: 'received',
        body: message.text,
        providerMessageId: message.providerMessageId,
        sentAt: message.receivedAt,
      })
      .onConflictDoNothing()
      .returning({ id: messagingMessages.id });
    if (rows.length === 0) {
      return false;
    }
    await tx
      .update(messagingConversations)
      .set({ lastInboundAt: message.receivedAt, updatedAt: sql`now()` })
      .where(eq(messagingConversations.id, conversation.id));
    return true;
  }

  /** The driver named a plug: the conversation is about it now, and about no charge yet. */
  async pointAt(
    tx: Transaction,
    conversationId: string,
    plug: { chargerId: string; connectorId: string },
  ): Promise<void> {
    await tx
      .update(messagingConversations)
      .set({
        chargerId: plug.chargerId,
        connectorId: plug.connectorId,
        sessionId: null,
        chargeKey: null,
        notifiedKinds: [],
        updatedAt: sql`now()`,
      })
      .where(eq(messagingConversations.id, conversationId));
  }
}
