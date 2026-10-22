import { asc, eq, isNull, lte, and } from 'drizzle-orm';
import { paymentWebhookEvents, Transaction, UuidV7 } from '@wattwisely/db';
import { ReceivedEvent } from '../gateway/payment-gateway';
import { WebhookEventRow } from './payment-rows';

/** Reads and writes the provider's webhook events (a global table: no tenant needed). */
export class WebhookEventStore {
  static readonly BATCH = 50;

  /** Stores the event once; null when the provider sent this event before. */
  async insertIfNew(
    tx: Transaction,
    provider: string,
    received: ReceivedEvent,
  ): Promise<WebhookEventRow | null> {
    const rows = await tx
      .insert(paymentWebhookEvents)
      .values({
        id: UuidV7.create(),
        provider,
        eventId: received.id,
        type: received.type,
        providerAccountId: received.accountId,
        payload: received.payload,
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }

  async markProcessed(tx: Transaction, id: string, now: Date): Promise<void> {
    await tx
      .update(paymentWebhookEvents)
      .set({ processedAt: now })
      .where(eq(paymentWebhookEvents.id, id));
  }

  async markFailed(tx: Transaction, id: string, failure: { error: string; nextAttemptAt: Date }) {
    await tx
      .update(paymentWebhookEvents)
      .set({
        attempts: (await this.attemptsOf(tx, id)) + 1,
        lastError: failure.error.slice(0, 1000),
        nextAttemptAt: failure.nextAttemptAt,
      })
      .where(eq(paymentWebhookEvents.id, id));
  }

  /** Events nobody has handled yet whose next try is due, oldest first. */
  async duePending(tx: Transaction, now: Date): Promise<WebhookEventRow[]> {
    return tx
      .select()
      .from(paymentWebhookEvents)
      .where(
        and(isNull(paymentWebhookEvents.processedAt), lte(paymentWebhookEvents.nextAttemptAt, now)),
      )
      .orderBy(asc(paymentWebhookEvents.receivedAt))
      .limit(WebhookEventStore.BATCH);
  }

  private async attemptsOf(tx: Transaction, id: string): Promise<number> {
    const rows = await tx
      .select({ attempts: paymentWebhookEvents.attempts })
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.id, id));
    return rows[0]?.attempts ?? 0;
  }
}
