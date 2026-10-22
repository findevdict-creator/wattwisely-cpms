import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthenticatedRequest } from './authenticated-request';
import { RequestAuth } from './request-auth';

/** Reads the RequestAuth that the guards attached to the request. */
export class CurrentAuthReader {
  static read(_data: unknown, context: ExecutionContext): RequestAuth {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) {
      throw new InternalServerErrorException('CurrentAuth used on a public route');
    }
    return auth;
  }
}

/** Controller parameter decorator: `me(@CurrentAuth() auth: RequestAuth)`. */
export const CurrentAuth = createParamDecorator(CurrentAuthReader.read);
