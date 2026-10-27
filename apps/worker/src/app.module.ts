import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DriverMailModule } from './driver-mail/driver-mail.module';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { ManagedJobsModule } from './managed/managed-jobs.module';
import { WorkerMetricsModule } from './metrics/worker-metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OperationsModule } from './operations/operations.module';
import { PaymentJobsModule } from './payments/payment-jobs.module';
import { ReportsModule } from './reports/reports.module';
import { SessionJobsModule } from './sessions/session-jobs.module';
import { FileStorageModule } from './storage/file-storage.module';

/**
 * Wires the worker together: settings, the database, e-mail, object storage, metrics, the
 * session, payment, managed service, alert, notification and report jobs, the retention and
 * queue count jobs (module 12), and health checks.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    FileStorageModule,
    WorkerMetricsModule,
    SessionJobsModule,
    PaymentJobsModule,
    ManagedJobsModule,
    NotificationsModule,
    AlertsModule,
    DriverMailModule,
    ReportsModule,
    OperationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
