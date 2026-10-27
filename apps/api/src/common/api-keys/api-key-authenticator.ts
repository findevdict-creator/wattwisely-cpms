import { Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { RequestAuth } from '../request/request-auth';
import { RequestOrigin } from '../request/request-origin';
import { ApiKeyAccessResolver } from './api-key-access.resolver';
import { ApiKeyRateLimiter } from './api-key-rate-limiter';

/**
 * A `wwk_…` bearer token (module 16): the key is looked up, checked against its own budget
 * for the minute, and turned into the request's auth with its tenant access ready.
 */
@Injectable()
export class ApiKeyAuthenticator {
  constructor(
    private readonly resolver: ApiKeyAccessResolver,
    private readonly limiter: ApiKeyRateLimiter,
  ) {}

  async authenticate(
    token: string,
    origin: RequestOrigin,
    reply: FastifyReply,
  ): Promise<RequestAuth> {
    const { principal, access } = await this.resolver.resolve(token);
    this.limiter.check(principal.id, reply);
    return RequestAuth.forApiKey(principal, access, origin);
  }
}
