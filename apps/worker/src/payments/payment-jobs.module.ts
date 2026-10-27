import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { PaymentGatewayFactory } from '@wattwisely/payments-stripe';
import { WorkerConfig } from '../config/worker.config';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { CardHoldTaker } from './card-hold.taker';
import { HoldRefusalNotifier } from './hold-refusal.notifier';
import { PaymentSettleJob } from './payment-settle.job';
import { SavedCardHoldJob } from './saved-card-hold.job';
import { SessionStartTimeoutJob } from './session-start-timeout.job';
import { WebhookRetryJob } from './webhook-retry.job';

/** The payment jobs (modules 6 and 19) and the provider they talk to: Stripe, or none without a key. */
@Module({
  imports: [SessionJobsModule, NotificationsModule],
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: WorkerConfig) =>
        PaymentGatewayFactory.fromKeys({
          secretKey: config.stripeSecretKey,
          publishableKey: '',
          webhookSecret: '',
        }),
      inject: [WorkerConfig],
    },
    PaymentSettleJob,
    SessionStartTimeoutJob,
    HoldRefusalNotifier,
    CardHoldTaker,
    SavedCardHoldJob,
    WebhookRetryJob,
  ],
})
export class PaymentJobsModule {}
