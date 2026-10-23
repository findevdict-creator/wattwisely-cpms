import { Global, Module } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';
import { JobMetrics } from './job-metrics';
import { MetricsController } from './metrics.controller';
import { QueueMetrics } from './queue-metrics';

/** The worker's metrics (module 12): job runs and the queue sizes, at GET /metrics. */
@Global()
@Module({
  providers: [
    { provide: MetricsRegistry, useFactory: () => new MetricsRegistry('worker') },
    JobMetrics,
    QueueMetrics,
  ],
  controllers: [MetricsController],
  exports: [MetricsRegistry, JobMetrics, QueueMetrics],
})
export class WorkerMetricsModule {}
