import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception';

/** Reads the token from an `Authorization: Bearer <token>` header. */
@Injectable()
export class BearerTokenExtractor {
  static readonly SCHEME = 'bearer';

  extract(authorizationHeader: string | undefined): string {
    const [scheme, token] = (authorizationHeader ?? '').split(' ');
    if (scheme?.toLowerCase() !== BearerTokenExtractor.SCHEME || !token) {
      throw new ProblemException(
        HttpStatus.UNAUTHORIZED,
        'token_missing',
        'Send an access token as "Authorization: Bearer <token>".',
      );
    }
    return token;
  }
}
