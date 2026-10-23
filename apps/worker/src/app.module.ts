import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { ManagedJobsModule } from './managed/managed-jobs.module';
import { PaymentJobsModule } from './payments/payment-jobs.module';
import { SessionJobsModule } from './sessions/session-jobs.module';

/** Wires the worker together: settings, the database, the session, payment and managed service jobs and health checks. */
@Module({
  imports: [ConfigModule, DatabaseModule, SessionJobsModule, PaymentJobsModule, ManagedJobsModule],
  controllers: [HealthController],
})
export class AppModule {}
