import { Controller, Get, Header } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';

/** GET /metrics for Prometheus (module 12). Caddy answers 404 for it from outside. */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsRegistry) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  text(): Promise<string> {
    return this.metrics.text();
  }
}
