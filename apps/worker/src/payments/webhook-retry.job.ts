import { Inject, Injectable } from '@nestjs/common';
import { TransactionRunner } from '@wattwisely/db';
import { PAYMENT_GATEWAY, PaymentGateway, WebhookInbox } from '@wattwisely/payments';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';

/**
 * WebhookRetryJob (Stripe Payments design, "Webhooks"): the API stores every event it
 * receives before handling it, so one it could not handle (the row was locked, say) is
 * handled here later instead of being lost. Returns how many went through.
 */
@Injectable()
export class WebhookRetryJob extends IntervalJob {
  private readonly inbox: WebhookInbox;

  constructor(
    private readonly config: WorkerConfig,
    runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) gateway: PaymentGateway,
  ) {
    super();
    this.inbox = new WebhookInbox(runner, gateway);
  }

  runOnce(now: Date): Promise<number> {
    return this.inbox.retryDue(now);
  }

  protected intervalMs(): number {
    return this.config.webhookRetryIntervalMs;
  }
}
