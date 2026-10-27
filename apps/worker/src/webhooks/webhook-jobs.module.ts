import { Module } from '@nestjs/common';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { AlertEventSource } from './sources/alert-event.source';
import { SessionEventSource } from './sources/session-event.source';
import { WebhookDeliverer } from './webhook-deliverer';
import { WebhookDeliveryJob } from './webhook-delivery.job';
import { WEBHOOK_EVENT_SOURCES, WebhookEventScanner } from './webhook-event-scanner';
import { WebhookScanJob } from './webhook-scan.job';
import { WebhookSender } from './webhook-sender';
import { WebhooksRepository } from './webhooks.repository';

/** The webhook jobs (module 16): the scan that queues events, and the delivery that sends them. */
@Module({
  imports: [SessionJobsModule],
  providers: [
    SessionEventSource,
    AlertEventSource,
    {
      provide: WEBHOOK_EVENT_SOURCES,
      useFactory: (...sources: unknown[]) => sources,
      inject: [SessionEventSource, AlertEventSource],
    },
    WebhooksRepository,
    WebhookSender,
    WebhookEventScanner,
    WebhookDeliverer,
    WebhookScanJob,
    WebhookDeliveryJob,
  ],
})
export class WebhookJobsModule {}
