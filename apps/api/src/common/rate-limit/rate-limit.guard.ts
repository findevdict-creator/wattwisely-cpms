import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiConfig } from '../../config/api.config';
import { RouteAccessReader } from '../auth/route-access.reader';
import { HttpMetrics } from '../metrics/http-metrics';
import { ProblemException } from '../problem/problem.exception';
import { FixedWindowCounter } from './fixed-window.counter';
import { RateLimit, RateLimitPolicy } from './rate-limit.decorator';

/**
 * Step 0 of every request (module 12): has this client address used up its budget for the
 * minute? Routes with a login spend the default budget; public reads and public writes have
 * their own, smaller ones, unless the route names another (RateLimit.policy) or none
 * (RateLimit.exempt). Over budget answers 429 rate_limited with Retry-After.
 * The address is the client's own because Fastify trusts Caddy's X-Forwarded-For
 * (TRUST_PROXY_HOPS); without that, every request would share Caddy's address.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly counter = new FixedWindowCounter();

  constructor(
    private readonly reflector: Reflector,
    private readonly routeAccess: RouteAccessReader,
    private readonly config: ApiConfig,
    private readonly metrics: HttpMetrics,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.policyOf(context);
    if (!this.config.rateLimits.isEnabled || policy === RateLimit.EXEMPT) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const limit = this.config.rateLimits[policy];
    const hit = this.counter.hit(`${policy}:${request.ip}`, limit, Date.now());
    if (!hit.isAllowed) {
      this.metrics.rateLimited(policy);
      http.getResponse<FastifyReply>().header('retry-after', String(hit.retryAfterSeconds));
      throw new ProblemException(
        HttpStatus.TOO_MANY_REQUESTS,
        'rate_limited',
        `Too many requests. Try again in ${hit.retryAfterSeconds} seconds.`,
      );
    }
    return true;
  }

  private policyOf(context: ExecutionContext): RateLimitPolicy | typeof RateLimit.EXEMPT {
    const named = this.reflector.getAllAndOverride<RateLimitPolicy | typeof RateLimit.EXEMPT>(
      RateLimit.POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (named) {
      return named;
    }
    if (!this.routeAccess.isPublic(context)) {
      return 'default';
    }
    const method = context.switchToHttp().getRequest<FastifyRequest>().method;
    return method === 'GET' || method === 'HEAD' ? 'public' : 'public_write';
  }
}
