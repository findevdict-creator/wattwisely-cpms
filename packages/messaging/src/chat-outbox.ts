import { sql } from 'drizzle-orm';
import { messagingConversations, messagingMessages, Transaction, UuidV7 } from '@wattwisely/db';
import { ChatReply } from './messaging-provider';

/** The conversation a reply goes to. */
export interface ChatConversationRef {
  id: string;
  tenantId: string;
}

/**
 * Writes what the platform says to a driver as a pending outbound message (module 17). The
 * API's chat handler and the worker's notifier both write here, inside their own transaction;
 * the worker's send job delivers the rows and records the outcome.
 */
export class ChatOutbox {
  async enqueue(
    tx: Transaction,
    conversation: ChatConversationRef,
    reply: ChatReply,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(messagingMessages).values({
      id,
      tenantId: conversation.tenantId,
      conversationId: conversation.id,
      direction: 'out',
      status: 'pending',
      body: reply.text,
      buttons: reply.buttons ?? null,
    });
    await tx
      .update(messagingConversations)
      .set({ lastOutboundAt: sql`now()`, updatedAt: sql`now()` })
      .where(sql`${messagingConversations.id} = ${conversation.id}`);
    return id;
  }
}
