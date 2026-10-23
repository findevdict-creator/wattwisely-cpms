import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { CapturePolicy } from '../flow/capture-policy';
import { PaymentGateway, ReceivedEvent } from '../gateway/payment-gateway';
import { WebhookEventRow } from '../store/payment-rows';
import { WebhookEventStore } from '../store/webhook-event-store';
import { WebhookProcessor } from './webhook-processor';

/** What became of a webhook delivery. */
export type WebhookOutcome = 'duplicate' | 'processed' | 'deferred';

/**
 * The webhook endpoint's three steps (Stripe Payments design, "Webhooks"): verify the
 * signature, store the event once, handle it. An event the handler could not finish
 * (the database was busy, say) stays unprocessed and the worker tries it again later;
 * the provider always gets 200 once the event is stored, so it does not resend it.
 */
export class WebhookInbox {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly gateway: PaymentGateway,
    private readonly events = new WebhookEventStore(),
    private readonly processor = new WebhookProcessor(runner),
  ) {}

  /** Throws PaymentGatewayError(invalid_signature) when the event is not the provider's. */
  async receive(rawBody: Buffer, signature: string, now: Date): Promise<WebhookOutcome> {
    const received = this.gateway.parseWebhook(rawBody, signature);
    const stored = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      this.events.insertIfNew(tx, this.gateway.provider, received),
    );
    if (!stored) {
      return 'duplicate';
    }
    return this.handle(stored, received, now);
  }

  /** Handles the stored events whose turn has come; returns how many went through. */
  async retryDue(now: Date): Promise<number> {
    const due = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      this.events.duePending(tx, now),
    );
    let processed = 0;
    for (const row of due) {
      const outcome = await this.handle(row, this.gateway.parseStoredEvent(row.payload), now);
      processed += outcome === 'processed' ? 1 : 0;
    }
    return processed;
  }

  private async handle(row: WebhookEventRow, received: ReceivedEvent, now: Date) {
    try {
      await this.processor.process(received, now);
      await this.runner.run(DatabaseSession.anonymous(), (tx) =>
        this.events.markProcessed(tx, row.id, now),
      );
      return 'processed' as const;
    } catch (error) {
      await this.runner.run(DatabaseSession.anonymous(), (tx) =>
        this.events.markFailed(tx, row.id, {
          error: (error as Error).message ?? String(error),
          nextAttemptAt: CapturePolicy.nextAttemptAt(row.attempts, now),
        }),
      );
      return 'deferred' as const;
    }
  }
}
