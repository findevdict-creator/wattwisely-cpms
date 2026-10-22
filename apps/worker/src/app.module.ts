import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { SessionJobsModule } from './sessions/session-jobs.module';

/** Wires the worker together: settings, the database, the session jobs and health checks. */
@Module({
  imports: [ConfigModule, DatabaseModule, SessionJobsModule],
  controllers: [HealthController],
})
export class AppModule {}
