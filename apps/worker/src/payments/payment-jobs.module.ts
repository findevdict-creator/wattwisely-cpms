import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { PaymentGatewayFactory } from '@wattwisely/payments-stripe';
import { WorkerConfig } from '../config/worker.config';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { PaymentSettleJob } from './payment-settle.job';
import { SessionStartTimeoutJob } from './session-start-timeout.job';
import { WebhookRetryJob } from './webhook-retry.job';

/** The payment jobs (module 6) and the provider they talk to: Stripe, or none without a key. */
@Module({
  imports: [SessionJobsModule],
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
    WebhookRetryJob,
  ],
})
export class PaymentJobsModule {}
