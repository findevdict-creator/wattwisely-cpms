import { ApiProperty } from '@nestjs/swagger';
import { WebhookOutcome } from '@wattwisely/payments';

/** The answer to a webhook delivery. Stripe only looks at the status code; this is for the logs. */
export class WebhookReceiptDto {
  @ApiProperty({ enum: ['duplicate', 'processed', 'deferred'] })
  readonly outcome: WebhookOutcome;

  constructor(outcome: WebhookOutcome) {
    this.outcome = outcome;
  }
}
