import { Module } from '@nestjs/common';
import { PUSH_SENDER } from '@wattwisely/push';
import { WorkerConfig } from '../config/worker.config';
import { TenantIterator } from '../jobs/tenant-iterator';
import { PushDeliveriesRepository } from './push-deliveries.repository';
import { PushNotifier } from './push-notifier';
import { PushNotifyJob } from './push-notify.job';
import { PushSenderFactory } from './push-sender.factory';
import { PushWatchRepository } from './push-watch.repository';

/** Push notifications to the mobile app (module 34): started, nearly full, idle fee, receipt. */
@Module({
  providers: [
    TenantIterator,
    {
      provide: PUSH_SENDER,
      useFactory: (config: WorkerConfig) => PushSenderFactory.create(config.push),
      inject: [WorkerConfig],
    },
    PushWatchRepository,
    PushDeliveriesRepository,
    PushNotifier,
    PushNotifyJob,
  ],
})
export class PushModule {}
