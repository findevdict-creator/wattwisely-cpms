import { Global, Module } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';
import { HttpMetrics } from './http-metrics';
import { MetricsController } from './metrics.controller';

/** The API's metrics (module 12): requests, rate limits and the Node.js process, at GET /metrics. */
@Global()
@Module({
  providers: [
    { provide: MetricsRegistry, useFactory: () => new MetricsRegistry('api') },
    HttpMetrics,
  ],
  controllers: [MetricsController],
  exports: [MetricsRegistry, HttpMetrics],
})
export class ApiMetricsModule {}
