import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';
import {
  chargers,
  chargingSessions,
  connectors,
  messagingChannels,
  messagingConversations,
  messagingMessages,
  MessagingButton,
  Transaction,
} from '@wattwisely/db';

/** A pending outbound message with where it goes. */
export interface DueMessage {
  id: string;
  body: string;
  buttons: MessagingButton[] | null;
  attempts: number;
  contact: string;
  phoneNumberId: string;
  accessToken: string;
}

/** A conversation tied to a charge, with what the charge is up to. */
export interface LinkedConversation {
  id: string;
  tenantId: string;
  chargeKey: string | null;
  notifiedKinds: string[];
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  energyWh: number;
  grossAmount: number | null;
  currency: string | null;
  pricedAt: Date | null;
  chargerIdentity: string;
  ocppConnectorId: number;
}

/** Reads and writes the chat rows the worker's jobs work on (module 17). */
@Injectable()
export class MessagingRepository {
  static readonly BATCH = 50;

  /** Pending outbound messages whose time has come, on channels that are switched on. */
  due(tx: Transaction, now: Date): Promise<DueMessage[]> {
    return tx
      .select({
        id: messagingMessages.id,
        body: messagingMessages.body,
        buttons: messagingMessages.buttons,
        attempts: messagingMessages.attempts,
        contact: messagingConversations.contact,
        phoneNumberId: messagingChannels.phoneNumberId,
        accessToken: messagingChannels.accessToken,
      })
      .from(messagingMessages)
      .innerJoin(
        messagingConversations,
        eq(messagingConversations.id, messagingMessages.conversationId),
      )
      .innerJoin(messagingChannels, eq(messagingChannels.id, messagingConversations.channelId))
      .where(
        and(
          eq(messagingMessages.direction, 'out'),
          eq(messagingMessages.status, 'pending'),
          lte(messagingMessages.nextAttemptAt, now),
          eq(messagingChannels.isActive, true),
        ),
      )
      .orderBy(messagingMessages.createdAt)
      .limit(MessagingRepository.BATCH);
  }

  async markSent(tx: Transaction, id: string, providerMessageId: string, now: Date) {
    await tx
      .update(messagingMessages)
      .set({
        status: 'sent',
        providerMessageId,
        sentAt: now,
        error: null,
        attempts: sql`${messagingMessages.attempts} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(messagingMessages.id, id));
  }

  /** A failed try: pending again at `nextAttemptAt`, or failed for good when that is null. */
  async markFailed(tx: Transaction, id: string, error: string, nextAttemptAt: Date | null) {
    await tx
      .update(messagingMessages)
      .set({
        status: nextAttemptAt ? 'pending' : 'failed',
        error,
        attempts: sql`${messagingMessages.attempts} + 1`,
        nextAttemptAt: nextAttemptAt ?? undefined,
        updatedAt: sql`now()`,
      })
      .where(eq(messagingMessages.id, id));
  }

  /** Conversations tied to a charge that has not been reported finished yet. */
  linked(tx: Transaction): Promise<LinkedConversation[]> {
    return tx
      .select({
        id: messagingConversations.id,
        tenantId: messagingConversations.tenantId,
        chargeKey: messagingConversations.chargeKey,
        notifiedKinds: messagingConversations.notifiedKinds,
        status: sql<string>`${chargingSessions.status}::text`,
        startedAt: chargingSessions.startedAt,
        endedAt: chargingSessions.endedAt,
        energyWh: chargingSessions.energyWh,
        grossAmount: chargingSessions.grossAmount,
        currency: chargingSessions.currency,
        pricedAt: chargingSessions.pricedAt,
        chargerIdentity: chargers.ocppIdentity,
        ocppConnectorId: connectors.ocppConnectorId,
      })
      .from(messagingConversations)
      .innerJoin(chargingSessions, eq(chargingSessions.id, messagingConversations.sessionId))
      .innerJoin(chargers, eq(chargers.id, chargingSessions.chargerId))
      .innerJoin(connectors, eq(connectors.id, chargingSessions.connectorId))
      .where(
        and(
          isNotNull(messagingConversations.sessionId),
          sql`not (${messagingConversations.notifiedKinds} ? 'finished')`,
        ),
      );
  }

  async addNotified(tx: Transaction, conversationId: string, kind: string): Promise<void> {
    await tx
      .update(messagingConversations)
      .set({
        notifiedKinds: sql`${messagingConversations.notifiedKinds} || ${JSON.stringify([kind])}::jsonb`,
        updatedAt: sql`now()`,
      })
      .where(eq(messagingConversations.id, conversationId));
  }
}
