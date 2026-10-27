import { HttpStatus, Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiConfig } from '../../config/api.config';
import { HttpMetrics } from '../metrics/http-metrics';
import { ProblemException } from '../problem/problem.exception';
import { FixedWindowCounter } from '../rate-limit/fixed-window.counter';

/**
 * A budget per API key and minute (module 16), on top of module 12's budget per client
 * address: an integration that loops too fast is slowed down without touching the people
 * who share its office address. Over budget answers 429 rate_limited with Retry-After.
 */
@Injectable()
export class ApiKeyRateLimiter {
  static readonly POLICY = 'api_key';

  private readonly counter = new FixedWindowCounter();

  constructor(
    private readonly config: ApiConfig,
    private readonly metrics: HttpMetrics,
  ) {}

  check(keyId: string, reply: FastifyReply, now: number = Date.now()): void {
    if (!this.config.rateLimits.isEnabled) {
      return;
    }
    const hit = this.counter.hit(keyId, this.config.rateLimits.apiKey, now);
    if (hit.isAllowed) {
      return;
    }
    this.metrics.rateLimited(ApiKeyRateLimiter.POLICY);
    reply.header('retry-after', String(hit.retryAfterSeconds));
    throw new ProblemException(
      HttpStatus.TOO_MANY_REQUESTS,
      'rate_limited',
      `This API key has used up its requests for the minute. Try again in ${hit.retryAfterSeconds} seconds.`,
    );
  }
}
