import { Module } from '@nestjs/common';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { NotificationSendJob } from './notification-send.job';
import { NotificationSender } from './notification.sender';
import { OutboxMailComposer } from './outbox-mail.composer';
import { OutboxRepository } from './outbox.repository';
import { OutboxWriter } from './outbox.writer';

/** The e-mail outbox (module 11): every job writes to it, and the send job empties it. */
@Module({
  imports: [SessionJobsModule],
  providers: [
    OutboxWriter,
    OutboxRepository,
    OutboxMailComposer,
    NotificationSender,
    NotificationSendJob,
  ],
  exports: [OutboxWriter],
})
export class NotificationsModule {}
