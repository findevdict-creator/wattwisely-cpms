import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception';

/** The problems a request with an API key can run into before it reaches a route (module 16). */
export class ApiKeyErrors {
  static invalid(): ProblemException {
    return new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'api_key_invalid',
      'This API key does not exist.',
    );
  }

  static revoked(): ProblemException {
    return new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'api_key_revoked',
      'This API key was revoked.',
    );
  }

  static expired(): ProblemException {
    return new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'api_key_expired',
      'This API key has expired.',
    );
  }

  /** API keys work in their tenant only: no admin console, no routes for a person's own account. */
  static notAllowed(): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'api_key_not_allowed',
      'API keys can only use the company routes; log in as a person for this.',
    );
  }
}
