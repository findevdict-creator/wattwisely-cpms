import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { WebhookRetrySchedule, WebhookUrlPolicy } from '@wattwisely/webhooks';
import { WorkerConfig } from '../config/worker.config';
import { WebhookSender } from './webhook-sender';
import { AttemptOutcome, DueDelivery, WebhooksRepository } from './webhooks.repository';

/**
 * Sends a tenant's due deliveries (module 16), one by one, and records each outcome: delivered
 * on a 2xx, otherwise tried again on the schedule until the tries are used up. The address is
 * checked once more before sending, in case the rule changed since the endpoint was saved.
 */
@Injectable()
export class WebhookDeliverer {
  static readonly BATCH = 100;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly webhooks: WebhooksRepository,
    private readonly sender: WebhookSender,
    private readonly config: WorkerConfig,
  ) {}

  /** How many deliveries were tried. */
  async deliverDue(tenantId: string, now: Date): Promise<number> {
    const due = await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.webhooks.findDue(tx, now, WebhookDeliverer.BATCH),
    );
    for (const delivery of due) {
      const outcome = await this.attempt(delivery, now);
      await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
        this.webhooks.recordAttempt(tx, delivery, outcome, now),
      );
    }
    return due.length;
  }

  private async attempt(delivery: DueDelivery, now: Date): Promise<AttemptOutcome> {
    const refused = WebhookUrlPolicy.problemOf(
      delivery.endpoint.url,
      this.config.isWebhookPrivateUrlAllowed,
    );
    const result = refused
      ? { statusCode: null, error: `address refused: ${refused}` }
      : await this.sender.send(delivery.endpoint.url, delivery.endpoint.secret, delivery, now);
    const isDelivered = result.error === null;
    return {
      isDelivered,
      statusCode: result.statusCode,
      error: result.error,
      nextAttemptAt: isDelivered
        ? null
        : WebhookRetrySchedule.nextAttemptAt(delivery.attempts + 1, now),
    };
  }
}
