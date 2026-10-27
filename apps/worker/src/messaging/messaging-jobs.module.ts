import { Module } from '@nestjs/common';
import { MESSAGING_PROVIDER, WhatsAppCloudProvider } from '@wattwisely/messaging';
import { WorkerConfig } from '../config/worker.config';
import { TenantIterator } from '../jobs/tenant-iterator';
import { ChatNotifyJob } from './chat-notify.job';
import { ChatSessionNotifier } from './chat-session-notifier';
import { MessageSender } from './message-sender';
import { MessagingRepository } from './messaging.repository';
import { MessagingSendJob } from './messaging-send.job';

/** The messaging add-on's jobs (module 17): reporting on linked charges, and sending what is queued. */
@Module({
  providers: [
    TenantIterator,
    {
      provide: MESSAGING_PROVIDER,
      useFactory: (config: WorkerConfig) =>
        new WhatsAppCloudProvider(config.whatsappApiUrl, config.whatsappAccessToken),
      inject: [WorkerConfig],
    },
    MessagingRepository,
    MessageSender,
    ChatSessionNotifier,
    MessagingSendJob,
    ChatNotifyJob,
  ],
})
export class MessagingJobsModule {}
