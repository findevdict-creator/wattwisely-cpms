import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../request/authenticated-request';
import { RequestAuth } from '../request/request-auth';
import { RequestOrigin } from '../request/request-origin';
import { AuthenticatedUserFactory } from './authenticated-user.factory';
import { BearerTokenExtractor } from './bearer-token.extractor';
import { KeycloakTokenVerifier } from './keycloak-token.verifier';
import { RouteAccessReader } from './route-access.reader';

/**
 * Step 1 of every request: who is calling?
 * Reads the bearer token, verifies it against Keycloak's keys and attaches
 * the caller to the request. Runs before TenantContextGuard.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly routeAccess: RouteAccessReader,
    private readonly tokenExtractor: BearerTokenExtractor,
    private readonly tokenVerifier: KeycloakTokenVerifier,
    private readonly userFactory: AuthenticatedUserFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.routeAccess.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.tokenExtractor.extract(request.headers.authorization);
    const claims = await this.tokenVerifier.verify(token);
    const origin = new RequestOrigin(request.ip, String(request.id));
    request.auth = new RequestAuth(this.userFactory.create(claims), origin);
    return true;
  }
}
