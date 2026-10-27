import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiKeyAuthenticator } from '../api-keys/api-key-authenticator';
import { ApiKeyToken } from '../api-keys/api-key-token';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { RequestOrigin } from '../request/request-origin';
import { BearerTokenExtractor } from './bearer-token.extractor';
import { RouteAccessReader } from './route-access.reader';
import { UserAuthenticator } from './user-authenticator';

/**
 * Step 1 of every request: who is calling?
 * Reads the bearer token, verifies it against Keycloak's keys and attaches
 * the caller to the request. A `wwk_…` token is an API key instead (module 16): the key is
 * looked up, checked against its own budget for the minute, and attached with its tenant
 * access ready, so TenantContextGuard only has to check the route. Runs before it.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly tokenExtractor: BearerTokenExtractor,
    private readonly users: UserAuthenticator,
    private readonly apiKeys: ApiKeyAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.routeAccess.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.tokenExtractor.extract(request.headers.authorization);
    const origin = new RequestOrigin(request.ip, String(request.id));
    request.auth = ApiKeyToken.isApiKey(token)
      ? await this.apiKeys.authenticate(
          token,
          origin,
          context.switchToHttp().getResponse<FastifyReply>(),
        )
      : await this.users.authenticate(token, origin);
    return true;
  }
}
