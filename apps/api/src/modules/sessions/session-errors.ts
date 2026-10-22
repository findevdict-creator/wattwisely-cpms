import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the sessions endpoints answer with. */
export class SessionErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'session_not_found',
      'This session does not exist.',
    );
  }

  static alreadyClosed(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'session_closed',
      'This session has already ended.',
    );
  }

  /** The worker is pricing it right now. */
  static busy(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'session_busy',
      'This session is being updated. Try again in a moment.',
    );
  }

  static invalidStatus(value: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `status: ${value} is not a session state`,
    );
  }

  static exportTooLarge(limit: number): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'export_too_large',
      `More than ${limit} sessions match. Choose a shorter period or fewer sites.`,
    );
  }
}
