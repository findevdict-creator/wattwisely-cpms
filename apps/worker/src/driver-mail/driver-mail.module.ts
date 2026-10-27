import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { SessionNotifier } from './session-notifier';
import { SessionNotifyJob } from './session-notify.job';
import { WatchedSessionsRepository } from './watched-sessions.repository';

/** The driver e-mails (module 11): updates during a charge and the receipt. */
@Module({
  imports: [SessionJobsModule, NotificationsModule],
  providers: [WatchedSessionsRepository, SessionNotifier, SessionNotifyJob],
})
export class DriverMailModule {}
