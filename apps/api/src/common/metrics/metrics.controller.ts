import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsRegistry } from '@wattwisely/observability';
import { RouteAccess } from '../auth/route-access.decorator';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * GET /metrics (outside /v1) for Prometheus (module 12). No login, like the health checks:
 * Caddy answers 404 for it from the internet, so only the monitoring inside Docker reads it.
 */
@ApiExcludeController()
@RouteAccess.public()
@RateLimit.exempt()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsRegistry) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  text(): Promise<string> {
    return this.metrics.text();
  }
}
