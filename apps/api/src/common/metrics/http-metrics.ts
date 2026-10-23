import { Injectable } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';
import { FastifyInstance } from 'fastify';

/**
 * How the API answers (module 12): every request by method, route pattern and status, and
 * the requests refused by a rate limit. The route is the pattern (/v1/sites/:id), never the
 * address itself, so ids do not become series; an address no route matches is "unmatched".
 */
@Injectable()
export class HttpMetrics {
  private readonly duration;
  private readonly limited;

  constructor(metrics: MetricsRegistry) {
    this.duration = metrics.histogram(
      'http_request_duration_seconds',
      'API requests, by method, route and status',
      ['method', 'route', 'status'],
    );
    this.limited = metrics.counter('http_rate_limited_total', 'Requests refused with 429', [
      'policy',
    ]);
  }

  /** Times every answer from Fastify's onResponse hook. */
  attach(server: FastifyInstance): void {
    server.addHook('onResponse', async (request, reply) => {
      this.duration.observe(
        {
          method: request.method,
          route: request.routeOptions.url ?? 'unmatched',
          status: String(reply.statusCode),
        },
        reply.elapsedTime / 1000,
      );
    });
  }

  rateLimited(policy: string): void {
    this.limited.inc({ policy });
  }
}
