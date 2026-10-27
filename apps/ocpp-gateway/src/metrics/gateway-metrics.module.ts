import { Global, Module } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';

/** The gateway's metrics registry (module 12); GatewayMetrics in OcppModule fills it. */
@Global()
@Module({
  providers: [{ provide: MetricsRegistry, useFactory: () => new MetricsRegistry('ocpp-gateway') }],
  exports: [MetricsRegistry],
})
export class GatewayMetricsModule {}
