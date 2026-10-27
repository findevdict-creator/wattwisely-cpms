import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { AlertDelivery } from './alert-delivery';
import { AlertRecipientsRepository } from './alert-recipients.repository';
import { AlertScanJob } from './alert-scan.job';
import { AlertStoreRepository } from './alert-store.repository';
import { ALERT_DETECTORS, AlertTracker } from './alert-tracker';
import { ChargerOfflineDetector } from './detectors/charger-offline.detector';
import { ConnectorFaultedDetector } from './detectors/connector-faulted.detector';
import { ResetNoReturnDetector } from './detectors/reset-no-return.detector';
import { SessionStuckDetector } from './detectors/session-stuck.detector';
import { StartFailuresDetector } from './detectors/start-failures.detector';

/** The alert job (module 11): detectors, the tracker that keeps alerts current, and delivery. */
@Module({
  imports: [SessionJobsModule, NotificationsModule],
  providers: [
    ChargerOfflineDetector,
    ConnectorFaultedDetector,
    SessionStuckDetector,
    StartFailuresDetector,
    ResetNoReturnDetector,
    {
      provide: ALERT_DETECTORS,
      useFactory: (...detectors: unknown[]) => detectors,
      inject: [
        ChargerOfflineDetector,
        ConnectorFaultedDetector,
        SessionStuckDetector,
        StartFailuresDetector,
        ResetNoReturnDetector,
      ],
    },
    AlertStoreRepository,
    AlertRecipientsRepository,
    AlertDelivery,
    AlertTracker,
    AlertScanJob,
  ],
})
export class AlertsModule {}
