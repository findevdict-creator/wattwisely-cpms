import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { GatewayMetricsModule } from './metrics/gateway-metrics.module';
import { MetricsController } from './metrics/metrics.controller';
import { OcppModule } from './ocpp.module';

/** Wires the gateway together: settings, the database, metrics, the OCPP machinery and health checks. */
@Module({
  imports: [ConfigModule, DatabaseModule, GatewayMetricsModule, OcppModule],
  controllers: [HealthController, MetricsController],
})
export class AppModule {}
