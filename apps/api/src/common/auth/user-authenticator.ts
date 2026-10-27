import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../request/request-auth';
import { RequestOrigin } from '../request/request-origin';
import { AuthenticatedUserFactory } from './authenticated-user.factory';
import { KeycloakTokenVerifier } from './keycloak-token.verifier';

/** A person's bearer token from Keycloak: verified, then turned into the request's auth. */
@Injectable()
export class UserAuthenticator {
  constructor(
    private readonly tokenVerifier: KeycloakTokenVerifier,
    private readonly userFactory: AuthenticatedUserFactory,
  ) {}

  async authenticate(token: string, origin: RequestOrigin): Promise<RequestAuth> {
    const claims = await this.tokenVerifier.verify(token);
    return new RequestAuth(this.userFactory.create(claims), origin);
  }
}
