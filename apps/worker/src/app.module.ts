import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DriverMailModule } from './driver-mail/driver-mail.module';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { ManagedJobsModule } from './managed/managed-jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentJobsModule } from './payments/payment-jobs.module';
import { ReportsModule } from './reports/reports.module';
import { SessionJobsModule } from './sessions/session-jobs.module';

/**
 * Wires the worker together: settings, the database, e-mail, the session, payment, managed
 * service, alert, notification and report jobs, and health checks.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    SessionJobsModule,
    PaymentJobsModule,
    ManagedJobsModule,
    NotificationsModule,
    AlertsModule,
    DriverMailModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
