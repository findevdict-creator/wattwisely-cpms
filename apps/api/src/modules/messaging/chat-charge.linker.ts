import { eq, sql } from 'drizzle-orm';
import { messagingConversations, Transaction } from '@wattwisely/db';

/**
 * Ties a paid charge to the chat it was asked for in (module 17). The link the driver got in
 * the chat carries the conversation's token as `?chat=`; the page sends it back when it starts
 * the charge, and from then on the worker reports the charge in that chat. An unknown token
 * is ignored: the charge is fine, it just has no chat.
 */
export class ChatChargeLinker {
  async link(
    tx: Transaction,
    linkToken: string,
    charge: { sessionId: string; chargeKey: string },
  ): Promise<boolean> {
    const rows = await tx
      .update(messagingConversations)
      .set({
        sessionId: charge.sessionId,
        chargeKey: charge.chargeKey,
        notifiedKinds: [],
        updatedAt: sql`now()`,
      })
      .where(eq(messagingConversations.linkToken, linkToken))
      .returning({ id: messagingConversations.id });
    return rows.length > 0;
  }
}
