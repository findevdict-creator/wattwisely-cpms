import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the alert endpoints answer with. */
export class AlertErrors {
  static notFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'alert_not_found',
      'This alert does not exist.',
    );
  }

  static notOpen(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'alert_not_open',
      'Only an open alert can be acknowledged. This one was acknowledged or closed already.',
    );
  }
}
