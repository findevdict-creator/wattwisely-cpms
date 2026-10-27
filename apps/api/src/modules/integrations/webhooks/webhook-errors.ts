import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../../common/problem/problem.exception';

/** The problems the /v1/webhooks endpoints answer with (module 16). */
export class WebhookErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'webhook_not_found',
      'This webhook endpoint does not exist.',
    );
  }

  static eventUnknown(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'webhook_event_unknown',
      `There is no event type called ${key}.`,
    );
  }

  static urlRefused(reason: string): ProblemException {
    return new ProblemException(HttpStatus.UNPROCESSABLE_ENTITY, 'webhook_url_refused', reason);
  }

  static tooMany(limit: number): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'webhook_limit_reached',
      `A company can have up to ${limit} webhook endpoints. Remove one first.`,
    );
  }
}
