import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the report endpoints answer with. */
export class ReportErrors {
  static readonly MAX_DAYS = 366;

  static invalidPeriod(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `to must be after from, and the period at most ${ReportErrors.MAX_DAYS} days.`,
    );
  }

  static exportNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'export_not_found',
      'This export does not exist.',
    );
  }

  static exportNotReady(status: string): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'export_not_ready',
      status === 'expired'
        ? 'This export has expired. Start a new one.'
        : 'This export is not ready yet. Try again in a moment.',
    );
  }

  /** Module 12: the file is in object storage, which cannot be reached right now. */
  static exportFileUnavailable(): ProblemException {
    return new ProblemException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'export_unavailable',
      'The file cannot be fetched right now. Try again in a few minutes.',
    );
  }

  static tooManyExports(limit: number): ProblemException {
    return new ProblemException(
      HttpStatus.TOO_MANY_REQUESTS,
      'too_many_exports',
      `You have ${limit} exports waiting already. Wait for them to finish.`,
    );
  }

  static scheduleNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'schedule_not_found',
      'This schedule does not exist.',
    );
  }

  static permission(key: string): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'permission_denied',
      `You need the ${key} permission.`,
    );
  }
}
