import { Module } from '@nestjs/common';
import { InboxController } from './inbox.controller';
import { InboxRepository } from './inbox.repository';
import { InboxService } from './inbox.service';
import { NotificationSettingsController } from './settings/notification-settings.controller';
import { NotificationSettingsRepository } from './settings/notification-settings.repository';
import { NotificationSettingsService } from './settings/notification-settings.service';

/** The staff side of notifications (module 11): the portal inbox and quiet hours. */
@Module({
  controllers: [InboxController, NotificationSettingsController],
  providers: [
    InboxRepository,
    InboxService,
    NotificationSettingsRepository,
    NotificationSettingsService,
  ],
})
export class NotificationsModule {}
