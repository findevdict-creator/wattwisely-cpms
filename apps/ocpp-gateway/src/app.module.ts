import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { OcppModule } from './ocpp.module';

/** Wires the gateway together: settings, the database, the OCPP machinery and health checks. */
@Module({
  imports: [ConfigModule, DatabaseModule, OcppModule],
  controllers: [HealthController],
})
export class AppModule {}
